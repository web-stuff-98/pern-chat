import type { NextApiRequest, NextApiResponse } from "next"
import checkAuth from "../../../utils/checkauth"

import pool from "../../../utils/db"
import pusher from "../../../utils/pusher"
import imageProcessing from "../../../utils/imageProcessing"

import applyMiddleware from "../../../utils/applyMiddleware"
import getRateLimitMiddlewares from "../../../utils/applyRatelimit"
const middlewares = getRateLimitMiddlewares({ limit: 180 }).map(applyMiddleware)

export default async function (req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET" && req.method !== "PUT" && req.method !== "POST") return res.status(405).end()

    try {
        await Promise.all(middlewares.map(middleware => middleware(req, res)))
    } catch {
        return res.status(429).end()
    }

    const authCheck = await checkAuth(req.cookies)
    if ((req.method === "POST" || req.method === "PUT") && !authCheck) return res.status(401).json({ message: "Unauthorized" })

    try {
        if (req.method === "POST" || req.method === "PUT") {
            const { base64pfp } = req.body
            if (!base64pfp) return res.status(400).json({ message: "" })
            const base64 = await imageProcessing(base64pfp, { width: 48, height: 48 })
            const checkExistsQuery = await pool.query("SELECT DISTINCT base64 FROM pfp WHERE owner=$1;", [authCheck.id])
            const getAccQuery = await pool.query("SELECT id,rooms,conversations FROM account WHERE id=$1;", [authCheck.id])
            if (getAccQuery.rowCount === 0) return res.status(404).json({ message: "No user" })
            const rooms = getAccQuery.rows[0].rooms
            const conversations = getAccQuery.rows[0].conversations
            await Promise.all(conversations.map((uid: number) => pusher.trigger(`private-inbox=${uid}`, "pfp-updated", { id: authCheck.id, base64pfp: base64 })))
            await Promise.all(rooms.map((roomId: number) => pusher.trigger(`room=${roomId}`, "pfp-updated", { id: authCheck.id, base64pfp: base64 })))
            await pusher.trigger(`private-inbox=${authCheck.id}`, "pfp-updated", { id: authCheck.id, base64pfp: base64 })
            if (checkExistsQuery.rowCount === 0) {
                await pool.query("INSERT INTO pfp(owner, base64, protected) VALUES($1, $2, $3);", [authCheck.id, base64, getAccQuery.rows[0].protected])
                return res.status(201).json({ message: "Updated pfp" })
            } else {
                await pool.query("UPDATE pfp SET base64 = $1 WHERE owner=$2", [base64, authCheck.id])
                return res.status(200).json({ message: "Updated pfp" })
            }
        }
        if (req.method === "GET") {
            const { id } = req.query
            const select = await pool.query("SELECT base64 FROM pfp WHERE owner=$1;", [id ? Number(id) : Number(authCheck.id)])
            if (select.rowCount === 0) return res.status(404).json({ message: "User has no profile pic" })
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