import type { NextApiRequest, NextApiResponse } from 'next'
import busboy from "busboy"
import checkAuth from '../../../utils/checkauth'
import pool from "../../../utils/db"
import pusher from "../../../utils/pusher"
import cloudinary from "cloudinary"

import applyMiddleware from "../../../utils/applyMiddleware"
import getRateLimitMiddlewares from "../../../utils/applyRatelimit"
const middlewares = getRateLimitMiddlewares({ limit: 30 }).map(applyMiddleware)

cloudinary.v2.config({
    cloud_name: "dzpzb3uzn",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const config = {
    api: { bodyParser: false }
}

/**
 * This API route is called from the client after the message is submitted
 * 
 * First it finds the message, checks the message owner matches up, then
 * it streams the file to cloudinary. Finally it updates the message with
 * a bit of information to let the client know the message has an attachment
 */

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
    if (req.method !== "POST") return res.status(405).end()

    const { roomId: rawRoomId, userId: rawUserId, msgId } = req.query
    if (!rawRoomId && !rawUserId || !msgId) return res.status(400).end()
    const roomId = Number(rawRoomId)
    const userId = Number(rawUserId)

    if (roomId) {
        //Add attachment to message in chatroom
        const getRoomQuery = await pool.query("SELECT messages FROM room WHERE id=$1", [roomId])
        if (getRoomQuery.rowCount === 0) return res.status(400).json({ message: "No room found" })
        const messages = getRoomQuery.rows[0].messages
        if (!messages) return res.status(400).json({ message: "Room has no messages" })
        const i = messages.findIndex((msg: any) => msg.id === msgId)
        if (i === -1) return res.status(400).json({ message: "Could not find message to attach file to" })
        if (Number(messages[i].author) !== authCheck.id) return res.status(401).json({ message: "Unauthorized" })
        uploadStream(req, res, String(msgId), messages, i, roomId, "chatroom")
    }

    if (userId) {
        //Add attachment to message in conversation (users inbox.messages)
        const getInboxQuery = await pool.query("SELECT id,inbox FROM account WHERE id=$1;", [userId])
        if (getInboxQuery.rowCount === 0) return res.status(400).json({ message: "No user found" })
        const messages = getInboxQuery.rows[0].inbox.messages
        if (!messages) return res.status(400).json({ message: "User has no messages" })
        const i = messages.findIndex((msg: any) => msg.id === msgId)
        if (i === -1) return res.status(400).json({ message: "Could not find message to attach file to" })
        if (Number(messages[i].author) !== authCheck.id) return res.status(401).json({ message: "Unauthorized" })
        uploadStream(req, res, String(msgId), messages, i, userId, "conversation")
    }
}

const uploadStream = (req: NextApiRequest, res: NextApiResponse, msgId: string, inMessages: any[], messageIndex: number, id: number, messageType: "chatroom" | "conversation") => {
    //id passed in here is either the recipient users id for conversations or the chatroom id
    const bb = busboy({ headers: req.headers })
    let mimeType: string
    bb.on('file', (_, file, info) => {
        mimeType = info.mimeType
        if (!mimeType.includes("video/") && !mimeType.includes("image/"))
            return res.status(400).json({ message: "Only videos and images allowed" })
        if (!["jpg", "jpeg", "gif", "png", "bmp", "avi", "mp4"].includes(mimeType.split("/")[1])) return res.status(400).json({ message: "Format not allowed" })
        const stream = cloudinary.v2.uploader.upload_stream({
            folder: `pern-chat/attachments${process.env.NODE_ENV === "development" ? "/dev" : ""}`,
            public_id: msgId,
            resource_type: "auto" //have to add resource_type auto or video here or it wont work with videos.
        })
        file.pipe(stream)
    })
    bb.on('close', () => {
        //update the message with attached file info and send pusher notification
        let outMessages = inMessages
        outMessages[messageIndex] = {
            ...outMessages[messageIndex],
            hasAttachment: true,
            attachmentPending: false,
            attachmentMimeType: mimeType
        }
        pool.query(messageType === "chatroom" ?
            `UPDATE room SET messages = $1::jsonb[] WHERE id=$2`
            :
            `UPDATE account SET inbox = $1::jsonb WHERE id=$2`
            , [messageType === "chatroom" ? outMessages : { messages: outMessages }, id]).then(() => {
                pusher.trigger(`${messageType === "chatroom" ? "room" : "inbox"}=${id}`, "attachment-uploaded", {
                    msgId,
                    mimeType
                }).then(() => {
                    res.writeHead(200, { Connection: "close" })
                    res.json({ message: "Message updated with attachment" })
                }).catch(() => {
                    res.writeHead(500, { Connection: "close" })
                    res.json({ message: "Message updated with attachment, but error with pusher" })
                }).finally(() => {
                    res.end()
                })
            }).catch(() => {
                res.writeHead(500, { Connection: "close" })
                res.json({ message: "Could not find message to attach file to" })
            })
    })
    req.pipe(bb)
    return
}