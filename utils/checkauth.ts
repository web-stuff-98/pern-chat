import { verify } from "jsonwebtoken"

import pool from "./db"

import has from "lodash/has"

const checkAuth = async (cookies: any) => {
    if (!cookies) return false
    if (!has(cookies, "token")) return false
    const payload = verify(cookies.token, process.env.JWT_SECRET!)
    if (!payload) return false
    try {
        const user = await pool.query("SELECT id,username,email FROM account WHERE id=$1", [Number(payload)])
        if(user.rowCount === 0) return false
        let outuser = user.rows[0]
        if (Object.keys(outuser).length === 0) return false
        delete outuser.password
        return outuser
    } catch {
        return false
    }
}
export default checkAuth