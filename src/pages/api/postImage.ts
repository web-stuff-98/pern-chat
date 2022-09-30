import type { NextApiRequest, NextApiResponse } from 'next'
import busboy from "busboy"
import checkAuth from '../../../utils/checkauth'
import pool from "../../../utils/db"
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

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        await Promise.all(middlewares.map(middleware => middleware(req, res)))
    } catch {
        return res.status(429).end()
    }

    if (req.method !== "POST" && req.method !== "PUT") return res.status(405).end()

    const authCheck = await checkAuth(req.cookies)
    if (!authCheck) return res.status(401).json({ message: "Unauthorized" })

    if (!req.query.postId)
        return res.status(400).end()

    const findPostQuery = await pool.query("SELECT owner FROM post WHERE id=$1", [Number(req.query.postId)])
    if (findPostQuery.rowCount === 0)
        return res.status(400).json({ message: "No post to upload image for" })

    if (findPostQuery.rows[0].owner !== authCheck.id)
        return res.status(403).json({ message: "Unauthorized" })

    uploadCoverImageStream(req, res)
}

const uploadCoverImageStream = (req: NextApiRequest, res: NextApiResponse): void => {
    const bb = busboy({
        headers: req.headers
    })
    bb.on('file', (_, file, info) => {
        const stream = cloudinary.v2.uploader.upload_stream({
            folder: `pern-chat/posts${process.env.NODE_ENV === "development" ? "/dev" : ""}`,
            public_id: String(req.query.postId),
            overwrite:true,
            unique_filename:false
        })
        file.pipe(stream)
    })
    bb.on('close', () => {
        pool.query("UPDATE post SET image_pending = FALSE WHERE id=$1", [Number(req.query.postId)]).then(() => {
            res.writeHead(200, { 'Connection': 'close' })
        }).catch(() => {
            res.writeHead(400, { 'Connection': 'close' })
        }).finally(() => {
            res.end()
        })
    })
    bb.on('error', (e) => {
        console.error(e)
        res.status(500).json({ message: "Error uploading cover image" })
    })
    req.pipe(bb)
    return
}