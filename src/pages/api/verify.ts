import type { NextApiRequest, NextApiResponse } from 'next'

import bcrypt from "bcrypt"
import { sign } from "jsonwebtoken"
import { setCookie } from 'cookies-next'

import pool from '../../../utils/db'

import applyMiddleware from "../../../utils/applyMiddleware"
import getRateLimitMiddlewares from "../../../utils/applyRatelimit"
const middlewares = getRateLimitMiddlewares({ limit: 5 }).map(applyMiddleware)

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        await Promise.all(middlewares.map(middleware => middleware(req, res)))
    } catch {
        return res.status(429).end()
    }

    try {
        //emailVerification is actually OTP. should have called it that
        const { emailVerification, email } = req.body
        if (!emailVerification || !email) return res.status(400).json({ message: "Input missing" })
        const findUserQuery = await pool.query("SELECT DISTINCT verify_email_otp FROM account WHERE email=$1;", [email.toLowerCase().trim()])
        if (findUserQuery.rowCount === 0) return res.status(404).json({ message: "Could not find user" })
        const match = await bcrypt.compare(emailVerification, findUserQuery.rows[0].verify_email_otp)
        if (!match) return res.status(403).json({ message: "OTP does not match" })
        else {
            const token = sign(findUserQuery.rows[0].id, process.env.JWT_SECRET!)
            setCookie('token', token, {
                req, res, maxAge: 60 * 60 * 24, httpOnly: true,
                secure: process.env.NODE_ENV === "development" ? false : true
                , sameSite: 'strict'
            });
            return res.status(200).json({ message: "Your account is now verified and logged in" })
        }
    } catch (e) {
        return res.status(400).json({ message: `${e}` })
    }
}