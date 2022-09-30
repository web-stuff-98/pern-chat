import type { NextApiRequest, NextApiResponse } from 'next'
import pool from "../../../utils/db"

import checkAuth from '../../../utils/checkauth'

import applyMiddleware from "../../../utils/applyMiddleware"
import getRateLimitMiddlewares from "../../../utils/applyRatelimit"
const middlewares = getRateLimitMiddlewares({ limit: 180 }).map(applyMiddleware)

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET" && req.method !== "POST") return res.status(405).end()

    try {
        await Promise.all(middlewares.map(middleware => middleware(req, res)))
    } catch {
        return res.status(429).end()
    }

    const authCheck = await checkAuth(req.cookies)
    if (!authCheck) return res.status(401).json({ message: "Unauthorized" })

    const { all, userId: rawUserId } = req.query
    const userId = Number(rawUserId)

    if (req.method === "GET") {
        try {
            const query = await pool.query("SELECT DISTINCT conversations,inbox FROM account WHERE id=$1", [authCheck.id])
            if (query.rowCount === 0) return res.status(401).json({ conversations: [] })
            const conversations = query.rows[0].conversations
            if (typeof all !== "undefined") {
                return res.status(200).json({ message: "", conversations: conversations ? conversations : [] })
            } else {
                //get all messages from conversation
                const queryRecipient = await pool.query("SELECT DISTINCT inbox FROM account WHERE id=$1", [userId])
                let messages = []
                let recipientMessages = []
                if (queryRecipient.rows[0].inbox)
                    recipientMessages = queryRecipient.rows[0].inbox.messages.filter((msg: any) => msg.author === authCheck.id)
                if (query.rows[0].inbox)
                    messages = query.rows[0].inbox.messages.filter((msg: any) => msg.author === userId)
                if (typeof rawUserId === "undefined") return res.status(200).json({ message: "", messages: [] })
                return res.status(200).json({
                    messages: [...messages, ...recipientMessages].sort((a: any, b: any) => a.timestamp - b.timestamp),
                })
            }
        } catch (e) {
            return res.status(400).json({ message: `${e}` })
        }
    }

    if (req.method === "POST") {
        try {
            const findUserQuery = await pool.query("SELECT id,username FROM account WHERE id=$1", [userId])
            if (findUserQuery.rowCount === 0) return res.status(404).json({ message: "User does not exist" })
            const findConversationQuery = await pool.query("SELECT DISTINCT conversations FROM account WHERE id=$1", [authCheck.id])
            if (findConversationQuery.rows[0])
                if (findConversationQuery.rows[0].conversations)
                    if (findConversationQuery.rows[0].conversations.find((uid: number) => uid === userId))
                        return res.status(200).json({ message: `You have already started a conversation with ${findUserQuery.rows[0].username}` })
            const updateQueryString = "UPDATE account SET conversations = conversations::int[] || $1::int WHERE id=$2"
            await pool.query(updateQueryString, [userId, authCheck.id])
            await pool.query(updateQueryString, [authCheck.id, userId])
            return res.status(200).json({ message: `Started conversation with ${findUserQuery.rows[0].username}` })
        } catch (e) {
            return res.status(400).json({ message: `${e}` })
        }
    }
}
