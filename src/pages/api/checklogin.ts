import type { NextApiRequest, NextApiResponse } from 'next'
import checkAuth from '../../../utils/checkauth'

import applyMiddleware from "../../../utils/applyMiddleware"
import getRateLimitMiddlewares from "../../../utils/applyRatelimit"
const middlewares = getRateLimitMiddlewares({ limit: 30 }).map(applyMiddleware)

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") return res.status(405).end()
    const authCheck = await checkAuth(req.cookies)
    if (!authCheck) return res.status(200).json({ message: "Not logged in" })
    res.status(200).json(authCheck)
}
