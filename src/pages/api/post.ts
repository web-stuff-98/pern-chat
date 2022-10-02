import type { NextApiRequest, NextApiResponse } from 'next'
import checkAuth from '../../../utils/checkauth'
import imageProcessing from '../../../utils/imageProcessing'
import embeddedImageProcessing from "../../../utils/embeddedImageProcessing"
import applyMiddleware from '../../../utils/applyMiddleware'
import getRateLimitMiddlewares from '../../../utils/applyRatelimit'
import cloudinary from "cloudinary"
import pool from '../../../utils/db'

import * as Yup from "yup"

cloudinary.v2.config({
  cloud_name: "dzpzb3uzn",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const middlewares = getRateLimitMiddlewares({ limit: 50 }).map(applyMiddleware)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET" && req.method !== "POST" && req.method !== "DELETE" && req.method !== "PATCH") return res.status(405).json({ message: "Unaccepted method" })

  try {
    await Promise.all(middlewares.map(middleware => middleware(req, res)))
  } catch {
    return res.status(429).end()
  }

  const authCheck = await checkAuth(req.cookies)
  if (req.method !== "GET" && !authCheck) return res.status(401).json({ message: "Unauthorized" })

  if (req.method === "POST") {
    try {
      await Yup.object().shape({
        title: Yup.string().required().max(90),
        description: Yup.string().required().max(130),
        content: Yup.string().required().max(30000),
        base64coverImage: Yup.string().required(),
        tags: Yup.string().max(70, 'Tags too long. Maximum 70 characters')
          //@ts-expect-error
          .test('missingHashtag', 'You need an # symbol for each tag.', (value: string) => (value && value.charAt(0) === '#'))
          //@ts-expect-error
          .test('noSpaces', 'Tags cannot have spaces.', (value: string) => (value && !value.includes(" ")))
          //@ts-expect-error
          .test('tooManyTags', 'Maximum 8 tags.', (value: string) => (value && value.split('#').length <= 8))
          //@ts-expect-error
          .test('tagTooLong', 'One of your tags is too long. Max 24 characters for each tag.', (value: string) => {
            const tags = value.split("#")
            tags.forEach((tag) => {
              if (tag.length > 24) return false
            })
            return true
          }),
      }).strict().validate(req.body)
    } catch (e) {
      return res.status(400).json({ message: `${e}`.replace("ValidationError: ", "") })
    }
    try {
      const { title, description, content, tags, base64coverImage } = req.body
      const slug = title.toLowerCase().replaceAll(" ", "-").replace(/[^\w-]+/g, '')
      const findPostQuery = await pool.query("SELECT id FROM post WHERE LOWER(title) = $1 OR slug = $2;", [title.toLowerCase(), slug])
      if (findPostQuery.rowCount > 0) return res.status(400).json({ message: "There is a post already with that title" })
      const optimizedEditorContent = Object.values(await embeddedImageProcessing(content)).join("")
      const imageBlur = await imageProcessing(base64coverImage, { width: 36, height: 24 })
      const insertQuery = await pool.query(`INSERT INTO post (owner,title,description,content,comments,tags,slug,protected,timestamp,image_pending,image_blur) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`, [
        authCheck.id,
        title,
        description,
        optimizedEditorContent,
        [],
        tags.split("#").map((tag: string) => tag.toLowerCase().trim()).filter((tag: string) => tag !== ''),
        slug,
        false,
        Date.now(),
        true,
        imageBlur,
      ])
      if (insertQuery.rowCount === 0) return res.status(500).json({ message: "Some internal error. Post wasn't inserted." })
      return res.status(201).json({ message: "Post created", id: insertQuery.rows[0].id })
    } catch (e) {
      console.error(e)
      return res.status(500).json({ message: "Internal error" })
    }
  }

  if (req.method === "PATCH") {
    const { title, description, content, tags, postId, base64coverImage } = req.body
    try {
      await Yup.object().shape({
        title: Yup.string().required().max(90),
        description: Yup.string().required().max(130),
        content: Yup.string().required().max(40000, "Post content too long. Images are converted into text, if you have a lot of embedded images you should remove some."),
        tags: Yup.string().max(70, 'Tags too long. Maximum 70 characters')
          //@ts-expect-error
          .test('missingHashtag', 'You need an # symbol for each tag.', (value: string) => (value && value.charAt(0) === '#'))
          //@ts-expect-error
          .test('noSpaces', 'Tags cannot have spaces.', (value: string) => (value && !value.includes(" ")))
          //@ts-expect-error
          .test('tooManyTags', 'Maximum 8 tags.', (value: string) => (value && value.split('#').length <= 8))
          //@ts-expect-error
          .test('tagTooLong', 'Max 24 characters for each tag.', (value: string) => {
            value.split("#").forEach((tag) => {
              if (tag.length > 24) return false
            })
            return true
          }),
        postId: Yup.number().required()
      }).validate(req.body)
    } catch (e) {
      return res.status(400).json({ message: `${e}`.replace("ValidationError: ", "") })
    }
    const checkAuthQuery = await pool.query("SELECT owner FROM post WHERE id=$1", [postId])
    if (checkAuthQuery.rowCount === 0) return res.status(400).json({ message: "No post to update" })
    if (checkAuthQuery.rows[0].owner !== authCheck.id) return res.status(403).json({ message: "Unauthorized" })
    const optimizedEditorContent = Object.values(await embeddedImageProcessing(content)).join("")
    let imageBlur;
    if (base64coverImage) imageBlur = await imageProcessing(base64coverImage, { width: 30, height: 20 })
    await pool.query(`UPDATE post SET title = $1, description = $2, content = $3, tags = $4, image_pending = $5${base64coverImage ? ",image_blur = $7" : ""} WHERE id = $6;`, [
      title,
      description,
      optimizedEditorContent,
      tags.split("#").map((tag: string) => tag.toLowerCase().trim()).filter((tag: string) => tag !== ''),
      base64coverImage ? true : false,
      postId,
      ...(base64coverImage ? [imageBlur] : [])])
    return res.status(200).json({ message: "Post updated." })
  }

  if (req.method === "DELETE") {
    const { postId: rawPostId } = req.query
    const postId = Number(rawPostId)
    await new Promise((resolve, reject) =>
      cloudinary.v2.uploader.destroy(`pern-chat/posts/${postId}`)
        .then((res: any) => resolve(res))
        .catch((e: any) => reject(e)))
    const checkAuthQuery = await pool.query("SELECT owner FROM post WHERE id=$1", [postId])
    if (checkAuthQuery.rowCount === 0) return res.status(400).json({ message: "No post to update" })
    if (checkAuthQuery.rows[0].owner !== authCheck.id) return res.status(403).json({ message: "Unauthorized" })
    const deleteQuery = await pool.query("DELETE FROM post WHERE id=$1 AND protected = FALSE RETURNING id;", [postId])
    if (deleteQuery.rowCount === 0) return res.status(500).json({ message: "Could not delete post. It is either protected or it has already been deleted." })
    return res.status(200).json({ message: "Deleted post" })
  }

  if (req.method === "GET") {
    const { postId: rawPostId } = req.query
    if (rawPostId) {
      const postId = Number(rawPostId)
      const findQuery = await pool.query("SELECT DISTINCT * FROM post WHERE id=$1", [postId])
      if (findQuery.rowCount === 0) return res.status(404).json({ message: "Could not find post" })
      return res.status(200).json(findQuery.rows[0])
    } else {
      return res.status(400).json({ message: "You must provide a post id" })
    }
  }
}