import type { NextApiRequest, NextApiResponse } from 'next'

import pool from '../../../../utils/db'
import pusher from '../../../../utils/pusher'
import checkAuth from '../../../../utils/checkauth'
import cloudinary from "cloudinary"

import applyMiddleware from "../../../../utils/applyMiddleware"
import getRateLimitMiddlewares from "../../../../utils/applyRatelimit"
const middlewares = getRateLimitMiddlewares({ limit: 180 }).map(applyMiddleware)

cloudinary.v2.config({
    cloud_name: "dzpzb3uzn",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

import { nanoid } from 'nanoid/async'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        await Promise.all(middlewares.map(middleware => middleware(req, res)))
    } catch {
        return res.status(429).end()
    }

    const authCheck = await checkAuth(req.cookies)
    if (!authCheck) return res.status(401).json({ message: "Unauthorized" })

    const { action } = req.body
    const { roomId: rawRoomId, userId: rawUserId } = req.query
    const roomId = Number(rawRoomId)
    const userId = Number(rawUserId)

    if (req.method === "POST") {
        const { message, hasAttachment } = req.body
        if (!message) return res.status(400).json({ message: "Cannot submit an empty message" })
        const msgId = await nanoid(12)
        if (action === "add-room-message") {
            await pool.query(`UPDATE room SET messages = messages || 
            '{  
                "author":   "${authCheck.id}",
                "message":  "${message}",
                "timestamp": "${Date.now()}",
                "id": "${msgId}"
                ${hasAttachment ? (`,
                "hasAttachment": "${true}",
                "attachmentPending": "${true}"
                `) : ""}
            }'::jsonb
            WHERE id=$1;`, [
                Number(roomId)
            ])
            await pusher.trigger(`room=${roomId}`, "room-message-added", {
                message,
                author: authCheck.id,
                timestamp: Date.now(),
                id: msgId,
                ...(hasAttachment ? { hasAttachment: true, attachmentPending: true } : {})
            })
            return res.status(200).json({ message: "", msgId })
        }
        if (action === "message-user") {
            const getInboxQuery = await pool.query("SELECT inbox FROM account WHERE id=$1", [userId])
            const hasInbox = getInboxQuery.rows[0].inbox ? true : false
            let newInbox = hasInbox ? getInboxQuery.rows[0].inbox : { messages: [] }
            newInbox.messages.push({ message, author: authCheck.id, timestamp: Date.now(), id: msgId })
            await pool.query(`UPDATE account SET inbox = $1::jsonb WHERE id=$2;`, [newInbox, userId])
            await pusher.trigger(`private-inbox=${userId}`, "message-added", { message, author: authCheck.id, timestamp: Date.now(), id: msgId })
            return res.status(200).json({ message: "", msgId })
        }
    }

    if (req.method === "PATCH") {
        if (action === "edit-room-message") {
            // Edit room message
            const { msgId, message } = req.body
            const findQuery = await pool.query(`SELECT messages FROM room WHERE id=$1;`, [roomId])
            if (findQuery.rowCount === 0) return res.status(404).json({ message: "Nothing to delete" })
            let msgs: any[] = findQuery.rows[0].messages
            const i = msgs.findIndex((msg: any) => msg.id === msgId)
            if (i === -1) return res.status(404).json({ message: "Nothing to edit" })
            if (Number(msgs[i].author) !== authCheck.id) return res.status(403).json({ message: "Unauthorized" })
            let newMessage = msgs[i]
            newMessage.message = message
            msgs[i] = newMessage
            await pool.query(`UPDATE room SET messages = $1::jsonb[] WHERE id=$2`, [
                msgs,
                roomId
            ])
            await pusher.trigger(`room=${roomId}`, "room-message-updated", { msgId, message })
            return res.status(200).json({ message: "Updated Message" })
        }
    }

    if (req.method === "DELETE") {
        if (action === "delete-room-message") {
            // Delete room message
            const { msgId } = req.body
            const findQuery = await pool.query(`SELECT messages FROM room WHERE id=$1;`, [roomId])
            if (findQuery.rowCount === 0) return res.status(404).json({ message: "Nothing to delete" })
            const msgs = findQuery.rows[0].messages
            const message = msgs.find((message: any) => message.id === msgId)
            if (message.hasAttachment)
                await new Promise((resolve, reject) =>
                    cloudinary.v2.uploader.destroy(`pern-chat/attachments${process.env.NODE_ENV === "development" ? "/dev" : ""}/${msgId}`)
                        .then((res) => resolve(res))
                        .catch((e) => reject(e)))
            if (Number(message.author) !== authCheck.id) return res.status(401).json({ message: "Unauthorized" })
            await pool.query(`UPDATE room SET messages = $1::jsonb[] WHERE id=$2`, [
                msgs.filter((msg: any) => msg.id !== msgId),
                roomId
            ])
            await pusher.trigger(`room=${roomId}`, "room-message-deleted", { msgId })
            return res.status(200).json({ message: "Deleted Message" })
        }
    }

    return res.status(200).end()
}
