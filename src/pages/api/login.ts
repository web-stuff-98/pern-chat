import type { NextApiRequest, NextApiResponse } from 'next'
import pool from "../../../utils/db"

import { setCookie } from "cookies-next"
import { sign } from "jsonwebtoken"
import { compare } from 'bcrypt'

import LoginValidateSchema from '../../yup/LoginValidateSchema'

import applyMiddleware from "../../../utils/applyMiddleware"
import getRateLimitMiddlewares from "../../../utils/applyRatelimit"
const middlewares = getRateLimitMiddlewares({ limit: 10 }).map(applyMiddleware)

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

    try {
        await LoginValidateSchema.strict().validate(req.body)
    } catch (e) {
        return res.status(400).json({ message: `${e}`.replace("ValidationError: ", "") })
    }

    try {
        const { password, email } = req.body
        const user = await pool.query("SELECT password,id,username,email_verified FROM account WHERE email=$1", [email.toLowerCase().trim()])
        if (user.rowCount === 0) return res.status(404).json({ message: "No user found" })
        if(user.rows[0].email_verified === false) return res.status(403).json({message:"You must verify your email first. Open the link sent to your inbox, it may be in the junk messages."})
        const { id: uid, password: passhash, username } = user.rows[0]
        await compare(password, passhash)
        setCookie('token', sign(uid, process.env.JWT_SECRET!), {
            req, res, maxAge: 60 * 60 * 24, httpOnly: true, sameSite: 'strict',
            secure: process.env.NODE_ENV === "development" ? false : true
        })
        return res.status(200).json({
            message: "Logged in successfully", user: {
                email, username
            }
        })
    } catch (e) {
        return res.status(400).json({ message: `${e}` })
    }
}
