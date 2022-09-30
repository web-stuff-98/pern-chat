import { GetStaticPaths, GetStaticProps } from "next"
import IPost from "../../interfaces/IPost"
import classes from "./ViewPost.module.scss"
import { useEffect, useState } from "react"
import { useInterface } from "../../context/InterfaceContext"
import { RWebShare } from "react-web-share"
import { BiExpand } from "react-icons/bi"
import Tilt from "react-parallax-tilt"
import { useAuth } from "../../context/AuthContext"
import Link from "next/link"
import { useModal } from "../../context/ModalContext"
import axios, { AxiosError } from "axios"
import { IResponseMessage } from "../../interfaces/GeneralInterfaces"
import Comments from "../../components/comments/Comments"
import Image from "next/image"
import pool from "../../../utils/db"

import has from "lodash/has"

export default function ViewPost({ post }: { post: IPost }) {
    const { state: iState } = useInterface()
    const { user } = useAuth()

    const [resMsg, setResMsg] = useState<IResponseMessage>({ message: "", error: false, pending: false })

    const deletePost = async () => {
        try {
            setResMsg({ message: "", error: false, pending: true })
            const axres = await axios({
                method: "DELETE",
                url: `/api/post?postId=${post.id}`,
                withCredentials: true
            })
            setResMsg({ message: axres.data.message, error: false, pending: false })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? setResMsg({ message: e.response.data.message, error: true, pending: false }) : setResMsg({ message: `${e}`, pending: false, error: true }))
                    : setResMsg({ message: `${e}`, pending: false, error: true })
            }
        }
    }

    return (
        <div className={classes.container}>
            {post ?
                <>
                    <div className={classes.imageContainer}>
                        <Image layout="fill" blurDataURL={post.image_blur} placeholder="blur" style={{ objectPosition: `0px ${iState.scrollTop * 0.5}px` }} alt={post.title} src={`https://res.cloudinary.com/dzpzb3uzn/image/upload/v1663407669/pern-chat/posts${process.env.NODE_ENV === "development" ? "/dev" : ""}/${post.id}`} />
                    </div>
                    <div className={classes.buttons}>
                        <RWebShare data={{
                            text: post.description,
                            url: `https://${process.env.DOMAIN}/post/${post.slug}`,
                            title: post.title,
                        }}>
                            <Tilt>
                                <button type="button">Share 🔗</button>
                            </Tilt>
                        </RWebShare>
                        {user && user.id === post.owner && <>
                            <Tilt>
                                <Link href={`/editor?postId=${post.id}`}>
                                    <button type="button">Edit</button>
                                </Link>
                            </Tilt>
                            <Tilt>
                                <button type="button" onClick={() => { }}>Delete</button>
                            </Tilt>
                        </>}
                    </div>
                    {resMsg.message && <p>{resMsg.message}</p>}
                    <div dangerouslySetInnerHTML={({ __html: String(post.content) })} className={classes.html} />
                    {/*<Comments postId={post.id} />*/}
                </>
                :
                <>
                    Error
                </>}
        </div>
    )
}

export const getStaticPaths: GetStaticPaths = async () => {
    let paths: any[] = []
    try {
        const getPostsQuery = await pool.query(`SELECT id,slug,owner,title,description,image_blur,timestamp,tags,content,comments FROM post WHERE image_pending = FALSE ORDER BY post.id DESC;`,)
        const posts = getPostsQuery.rows
        paths = posts.map((post:any) => ({ params: { slug: post.slug } }))
    } catch (e) {
        console.error(e)
    }
    return {
        paths,
        fallback: "blocking"
    }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
    let post
    try {
        const getPostQuery = await pool.query("SELECT DISTINCT * FROM post WHERE slug=$1", [params?.slug])
        post = getPostQuery.rows[0]
    } catch (e) {
        console.error(e)
    }
    return {
        props: {
            post
        },
        revalidate: 30,
    }
}

