import type { NextApiRequest, NextApiResponse } from 'next'
import pool from "../../../utils/db"

import { setCookie } from "cookies-next"
import { sign } from "jsonwebtoken"

import bcrypt from "bcrypt"

import * as Yup from "yup"
YupPassword(Yup)
import YupPassword from "yup-password"

import nodemailer from "nodemailer"
import OTP from '../../../utils/otp'

import applyMiddleware from "../../../utils/applyMiddleware"
import getRateLimitMiddlewares from "../../../utils/applyRatelimit"
const middlewares = getRateLimitMiddlewares({ limit: 5 }).map(applyMiddleware)

const createTransport = () => nodemailer.createTransport({ port: 587, host: "smtp-mail.outlook.com", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, tls: { ciphers: 'SSLv3' }, secure: false })

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
    await Yup.object().shape({
      email: Yup.string()
        .email()
        .max(100, 'Too many characters.')
        .required('Email required'),
      password: Yup.string().required('Password required')
        .min(8, 'Password must contain 8 or more characters')
        .minLowercase(1, 'Password must contain ast least 1 lowercase character')
        .minUppercase(1, 'Password must contain at least one uppercase character')
        .minSymbols(1, 'Password must contain at least 1 special character')
        .max(100, 'Max 100 characters'),
      username: Yup.string().required().max(24, 'Max 24 character'),
      confirmPassword: Yup.string().required(),
      readPolicy: Yup.boolean().required('You must agree to and read the policy')
    }).strict().validate(req.body)
  } catch (e) {
    return res.status(400).json({ message: `${e}`.replace("ValidationError: ", "") })
  }

  try {
    if (!req.body.readPolicy) return res.status(400).json({ message: "You must read and agree to the policy" })
    const { username, password, email } = req.body
    const passhash = await bcrypt.hash(password, 10)
    const verify_email_otp = OTP()
    const verify_email_otp_hash = await bcrypt.hash(verify_email_otp, 10)
    const user = await pool.query("INSERT INTO account (username, password, email, conversations, rooms, verify_email_otp, protected, email_verified, timestamp) VALUES($1, $2, $3, $4, $4, $5, $6, $7, $8) RETURNING id", [username, passhash, email.toLowerCase().trim(), [], verify_email_otp_hash, false, false, Date.now()])
    if (process.env.NODE_ENV !== "development") {
      await new Promise((resolve, reject) => {
        const transport = createTransport()
        const options = {
          from: process.env.SMTP_USER,
          to: email,
          subject: "Login email verification",
          html: `<a href="${process.env.NODE_ENV === "development" ? "http://localhost:3000" : `https://${process.env.DOMAIN}`}/?emailVerification=${verify_email_otp}&email=${email}">Click to verify your email address and login</a>`
        }
        transport.sendMail(options, (err: any, info: any) => {
          if (!err) {
            resolve(info)
          } else {
            reject(err)
          }
        })
      })
      return res.status(201).json({ message: "Account created. Open the verification link sent to your email to login. It will most likely be in your junk mail." })
    }
    const id = user.rows[0].id
    const token = sign(id, process.env.JWT_SECRET!)
    setCookie('token', token, {
      req, res, maxAge: 60 * 60 * 24, httpOnly: true, sameSite: 'strict',
      secure: process.env.NODE_ENV === "development" ? false : true
    })
    return res.status(201).json({ message: "Account created" })
  } catch (e) {
    return res.status(400).json({ message: `${e}` })
  }
}
