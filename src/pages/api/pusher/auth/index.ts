import type { NextApiRequest, NextApiResponse } from 'next'
import pusher from '../../../../../utils/pusher'

import checkAuth from '../../../../../utils/checkauth'

import applyMiddleware from "../../../../../utils/applyMiddleware"
import getRateLimitMiddlewares from "../../../../../utils/applyRatelimit"
const middlewares = getRateLimitMiddlewares({ limit: 150 }).map(applyMiddleware)

/**
 * You need to enable private channels in your pusher app dashboard...
 * its not very clear you need to do that in the documentation.
 * 
 * Pusher channels using the private- or presence- prefix
 * will use this route to authenticate subscriptions
 */

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") return res.status(405).end()

    try {
        await Promise.all(middlewares.map(middleware => middleware(req, res)))
    } catch {
        return res.status(429).end()
    }

    const authCheck = await checkAuth(req.cookies)
    if (!authCheck) return res.status(401).json({ message: "Unauthorized" })

    try {
        const { socket_id: socketId, channel_name: channel } = req.body
        const authRes = pusher.authorizeChannel(socketId, channel)
        if (channel.includes("inbox=")) {
            const id = Number(channel.split("inbox=")[1])
            if (id !== authCheck.id) return res.status(403).end()
        }
        res.send(authRes)
    } catch (e) {
        return res.status(400).json({ message: `${e}` })
    }
}
