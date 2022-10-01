import passport from "passport"
import { Strategy as GoogleStrategy } from "passport-google-oauth2"

import jwt from "jsonwebtoken"
import imageProcessing from "../utils/imageProcessing"
import axios from "axios"
import pool from "./db"

/*
    this doesn't actually use googles access token.
    dont really care, cba with it. want to complete
    this project already. It just creates a jwt using
    the user id same as with a normal login.
*/

passport.use('google', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === "development" ? 'http://localhost:3000/api/google/callback' : `https://${process.env.DOMAIN}/api/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const findUserQuery = await pool.query("SELECT id,username,email FROM account WHERE email = $1;", [profile.email.toLowerCase().trim()])
        if (findUserQuery.rowCount === 0) {
            //create user
            //this query string is too long.
            const createUserQuery = await pool.query("INSERT INTO account (email,username,password,conversations,rooms,inbox,verify_email_otp,login_method,tokens,protected,email_verified,timestamp) VALUES($1,$2,$3::VARCHAR(200),$4::INT[],$5::INT[],$6,$7,$8,$9::VARCHAR(200)[],$10,$11,$12) RETURNING id,username,email;", [
                profile.email.toLowerCase().trim(),
                profile.displayName,
                "", //password is empty because google login
                [],
                [],
                { messages: [] },
                "", //verify_email_otp is empty because google login
                "google",
                [],
                false,
                true, //email is automatically verified because google login
                Date.now()
            ])
            if (createUserQuery.rowCount === 0) return res.status(500).json({ message: "Failed - Internal error" })
            const token = jwt.sign(createUserQuery.rows[0].id, process.env.JWT_SECRET)
            await pool.query("UPDATE account SET tokens = $1::VARCHAR(200)[] WHERE id=$2;", [
                [token],
                createUserQuery.rows[0].id
            ])
            //create pfp
            const pfpRes = await axios({
                method: "GET",
                url: profile.picture,
                headers: { "Content-type": "image/jpeg" },
                responseType: "arraybuffer"
            })
            const bufferString = Buffer.from(pfpRes.data, "binary").toString("base64")
            const pfpBase64 = await imageProcessing(bufferString, { width: 70, height: 70 })
            await pool.query("INSERT INTO pfp (owner,base64) VALUES($1::INT,$2::VARCHAR(5000))", [
                createUserQuery.rows[0].id,
                pfpBase64
            ])
            done(null, createUserQuery.rows[0], { message: 'Signed in', token })
        } else {
            const token = jwt.sign(findUserQuery.rows[0].id, process.env.JWT_SECRET)
            await pool.query("UPDATE account SET tokens = $1::VARCHAR(200)[] WHERE id=$2", [
                [token],
                findUserQuery.rows[0].id
            ])
            done(null, findUserQuery.rows[0], { message: 'Signed in', token })
        }
    } catch (e) {
        console.error(e)
        done(e, false, { message: 'Internal server error' })
    }
}))