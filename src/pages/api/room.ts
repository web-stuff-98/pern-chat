import type { NextApiRequest, NextApiResponse } from 'next'
import pool from "../../../utils/db"

import * as Yup from "yup"
import checkAuth from '../../../utils/checkauth'

import pusher from '../../../utils/pusher'

import applyMiddleware from "../../../utils/applyMiddleware"
import getRateLimitMiddlewares from "../../../utils/applyRatelimit"
const middlewares = getRateLimitMiddlewares({ limit: 80 }).map(applyMiddleware)

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST" && req.method !== "GET" && req.method !== "DELETE") return res.status(405).end()

    try {
        await Promise.all(middlewares.map(middleware => middleware(req, res)))
    } catch {
        return res.status(429).end()
    }

    const authCheck = await checkAuth(req.cookies)
    if (!authCheck) return res.status(401).json({ message: "Unauthorized" })

    try {
        if (req.method === "POST" || req.method === "DELETE")
            await Yup.object().shape({
                roomName: Yup.string().required().max(100)
            }).strict().validate(req.body)
    } catch (e) {
        return res.status(400).json({ message: `${e}`.replace("ValidationError: ", "") })
    }

    if (req.method === "POST") {
        try {
            const { roomName } = req.body
            const room = await pool.query("SELECT DISTINCT * FROM room WHERE name=$1", [roomName.trim()])
            const allRooms = await pool.query("SELECT COUNT(*) FROM room WHERE owner=$1", [authCheck.id])
            if (allRooms.rows[0].count === 5) return res.status(400).json({ message: "You can create a maximum of 5 rooms" })
            if (room.rowCount === 0) {
                //CREATE
                const insertQuery = await pool.query("INSERT INTO room (owner, name, messages, timestamp, protected) VALUES($1, $2, $3::jsonb[], $4, $5) RETURNING *;", [
                    authCheck.id,
                    roomName.trim(),
                    [],
                    Date.now(),
                    (authCheck.email === process.env.EMAIL)
                ])
                await pusher.trigger(`rooms`, "room-added", { owner: authCheck.id, name: roomName.trim(), messages: [], timestamp: Date.now() })
                await pool.query("UPDATE account SET rooms = rooms || $1::int WHERE id=$2", [insertQuery.rows[0].id, authCheck.id])
                return res.status(201).json({ message: "", room: room.rows[0], created: true })
            } else {
                //JOIN
                const coverImage = await pool.query("SELECT DISTINCT base64 FROM roomImage WHERE room=$1", [room.rows[0].id])
                const getAccQuery = await pool.query("SELECT rooms FROM account WHERE id=$1;", [authCheck.id])
                if (getAccQuery.rowCount === 0) return res.status(404).json({ message: "No user" })
                if (!getAccQuery.rows[0].rooms.includes(room.rows[0].id))
                    await pool.query("UPDATE account SET rooms = rooms || $1::int WHERE id=$2", [room.rows[0].id, authCheck.id])
                return res.status(200).json({
                    message: "", room: {
                        ...room.rows[0], ...(coverImage.rowCount !== 0 ? {
                            base64coverImage: coverImage.rows[0].base64
                        } : {})
                    },
                    created: false
                })
            }
        } catch (e) {
            return res.status(400).json({ message: `${e}` })
        }
    }

    if (req.method === "GET") {
        try {
            const rooms = await pool.query("SELECT id,name,timestamp,owner FROM room;")
            const roomImages = await pool.query("SELECT room,base64 FROM roomImage;")
            return res.status(200).json({
                message: "", rooms: rooms.rowCount === 0 ? [] :
                    rooms.rows.map((room: any) => {
                        const base64coverImage = roomImages.rows.find((roomImage: any) => roomImage.room === room.id)
                        return {
                            ...room,
                            ...(base64coverImage ? { base64coverImage: base64coverImage.base64 } : {})
                        }
                    })
            })
        } catch (e) {
            return res.status(400).json({ message: `${e}` })
        }
    }

    if (req.method === "DELETE") {
        try {
            const { roomName } = req.body
            const findRoomQuery = await pool.query("SELECT id,owner,protected FROM room WHERE name=$1", [roomName])
            if (findRoomQuery.rowCount === 0) return res.status(404).json({ message: "No room to delete" })
            const matchingRoom = findRoomQuery.rows[0]
            if (matchingRoom.owner !== authCheck.id || matchingRoom.protected) return res.status(403).json({ message: "Unauthorized" })
            await pool.query("DELETE FROM room WHERE name=$1;", [req.body.roomName])
            await pool.query("DELETE FROM roomImage WHERE room=$1;", [findRoomQuery.rows[0].id])
            await pusher.trigger(`rooms`, "room-deleted", { roomName })
            return res.status(200).json({ message: "Room deleted" })
        } catch (e) {
            return res.status(400).json({ message: `${e}` })
        }
    }
}
