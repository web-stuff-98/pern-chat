import type { NextApiRequest, NextApiResponse } from 'next'
import pool from "../../../utils/db"

import checkAuth from '../../../utils/checkauth'

import * as Yup from "yup"
import YupPassword from 'yup-password'
YupPassword(Yup)

import { compare, hash } from 'bcrypt'

import applyMiddleware from "../../../utils/applyMiddleware"
import getRateLimitMiddlewares from "../../../utils/applyRatelimit"
const middlewares = getRateLimitMiddlewares({ limit: 150 }).map(applyMiddleware)

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
    if (!authCheck && (req.query.all || req.query.search)) return res.status(401).json({ message: "Unauthorized" })

    if (req.method === "POST") {
        try {
            await Yup.object().shape({
                currentPassword: Yup.string().required().max(100),
                newPassword: Yup.string().required('Password required')
                    .min(8, 'Password must contain 8 or more characters')
                    .minLowercase(1, 'Password must contain ast least 1 lowercase character')
                    .minUppercase(1, 'Password must contain at least one uppercase character')
                    .minSymbols(1, 'Password must contain at least 1 special character')
                    .max(100, 'Max 100 characters'),
                newPasswordConfirm: Yup.string().required().max(100)
            }).strict().validate(req.body)
        } catch (e) {
            return res.status(400).json({ message: `${e}`.replaceAll("ValidationError: ", "") })
        }
    }

    const { all, id, search, updatePass } = req.query
    try {
        if (updatePass) {
            const { currentPassword, newPassword, newPasswordConfirm } = req.body
            if (newPassword !== newPasswordConfirm)
                return res.status(400).json({ message: "New password confirm does not match" })
            const getAccQuery = await pool.query("SELECT * FROM account WHERE id=$1", [authCheck.id])
            if (getAccQuery.rowCount === 0) return res.status(404).json({ message: "Could not find account" })
            const loginMethod = getAccQuery.rows[0].login_method
            const isProtected = getAccQuery.rows[0].protected
            if (isProtected)
                return res.status(400).json({ message: "You cannot change the test account passwords." })
            if (loginMethod)
                if (loginMethod === "google")
                    return res.status(400).json({ message: "You cannot update your password because you logged in using your Google account." })
            if (!(await compare(currentPassword, getAccQuery.rows[0].password)))
                return res.status(400).json({ message: "Incorrect current password" })
            const passHash = await hash(newPassword, 10)
            await pool.query("UPDATE account SET password = $1;", [passHash])
            return res.status(200).json({ message: "Password updated" })
        }

        if (all || id) {
            const accounts = await pool.query(all ?
                "SELECT id,username FROM account"
                :
                `SELECT DISTINCT id,username FROM account where id=${Number(id)}`
            )
            let pfps: any[] = []
            if (all)
                pfps = (await pool.query("SELECT owner,base64 FROM pfp;")).rows
            else if (id) {
                pfps = (await pool.query("SELECT DISTINCT owner,base64 FROM pfp WHERE owner=$1;", [id])).rows
            }
            return res.status(200).json({
                message: "",
                accounts: accounts.rows.map((acc: any) => {
                    const matchingPfp = all ?
                        pfps.find((pfp: any) => pfp.owner === acc.id) : pfps[0]
                    return { ...acc, ...(matchingPfp ? { base64pfp: matchingPfp.base64 } : {}) }
                }),
            })
        }
        const searchInput = String(search).replaceAll("-", " ")
        const accounts = await pool.query(`SELECT id,username FROM account WHERE LOWER(username) LIKE '%${searchInput}%';`)
        return res.status(200).json({ message: `Found ${accounts.rowCount} users`, accounts: accounts.rows })
    } catch (e) {
        return res.status(400).json({ message: `${e}` })
    }
}