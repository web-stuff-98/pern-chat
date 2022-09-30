import type { NextApiRequest, NextApiResponse } from "next"
import checkAuth from "../../../utils/checkauth"

import pool from "../../../utils/db"
import imageProcessing from "../../../utils/imageProcessing"

import pusher from '../../../utils/pusher'

import applyMiddleware from "../../../utils/applyMiddleware"
import getRateLimitMiddlewares from "../../../utils/applyRatelimit"
const middlewares = getRateLimitMiddlewares({ limit: 150 }).map(applyMiddleware)

export default async function (req: NextApiRequest, res: NextApiResponse,) {
    if (req.method !== "GET" && req.method !== "PUT" && req.method !== "POST") return res.status(405).end()

    try {
        await Promise.all(middlewares.map(middleware => middleware(req, res)))
    } catch {
        return res.status(429).end()
    }

    const authCheck = await checkAuth(req.cookies)
    if ((req.method === "POST" || req.method === "PUT") && !authCheck) return res.status(403).json({ message: "Unauthorized" })

    try {
        if (req.method === "POST" || req.method === "PUT") {
            const { base64img, roomName } = req.body
            if (!base64img) return res.status(400).json({ message: "You must provide an input image" })
            const getRoomFromNameQuery = await pool.query("SELECT DISTINCT id FROM room WHERE name=$1", [roomName])
            if (getRoomFromNameQuery.rowCount === 0) return res.status(404).json({ message: "No room to update" })
            const roomId = getRoomFromNameQuery.rows[0].id
            const base64 = await imageProcessing(base64img, { width: 150, height: 25 })
            const checkExistsQuery = await pool.query("SELECT DISTINCT base64 FROM roomImage WHERE room=$1", [roomId])
            await pusher.trigger(`rooms`, "room-cover-image-updated", { name: roomName, base64 })
            await pusher.trigger(`room=${roomId}`, "room-cover-image-updated", { base64 })
            if (checkExistsQuery.rowCount === 0) {
                await pool.query("INSERT INTO roomImage(room, base64) VALUES($1, $2);", [roomId, base64])
                return res.status(201).end()
            } else {
                await pool.query("UPDATE roomImage SET base64 = $1 WHERE room=$2", [base64, roomId])
                return res.status(200).end()
            }
        }
        if (req.method === "GET") {
            const { roomName } = req.query
            const getRoomFromNameQuery = await pool.query("SELECT DISTINCT id FROM room WHERE name=$1", [roomName])
            if (getRoomFromNameQuery.rowCount === 0) return res.status(404).json({ message: "No room to update" })
            const roomId = getRoomFromNameQuery.rows[0].id
            const select = await pool.query("SELECT base64 FROM roomImage WHERE room=$1", [roomId])
            if (select.rowCount === 0) return res.status(404).json({ message: "Room has no cover image" })
            //Sending back as a buffer because its fancy
            const buffer = Buffer.from(select.rows[0].base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''), 'base64')
            res.statusCode === 200
            res.setHeader("Content-type", "image/jpeg")
            res.setHeader("Content-length", buffer.length)
            res.setHeader("Cache-control", "public")
            res.end(buffer)
        }
    } catch (e) {
        return res.status(400).json({ messsage: `${e}` })
    }
}