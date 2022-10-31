import axios, { AxiosError } from "axios"
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react"
import { BiChevronDown, BiChevronUp } from "react-icons/bi"
import { useUsers } from "../../context/UsersContext"
import { IResponseMessage } from "../../interfaces/GeneralInterfaces"
import useComments from "../../../utils/useComments"
import User from "../user/User"
import classes from "./Comments.module.scss"
import { MdEdit, MdDeleteForever, MdClose } from "react-icons/md"
import { useAuth } from "../../context/AuthContext"
import { AiOutlineEdit } from "react-icons/ai"
import Link from "next/link"
import { RiMailSendFill } from "react-icons/ri"
import { usePusher } from "../../context/PusherContext"

import has from "lodash/has"

export default function Comments({ postId }: { postId: number }) {
    const commentFormRef = useRef<HTMLFormElement>(null)
    const editCommentFormRef = useRef<HTMLFormElement>(null)

    const [resMsg, setResMsg] = useState<IResponseMessage>({ message: "", error: false, pending: false })

    const [commentInput, setCommentInput] = useState('')
    const handleCommentInput = (e: ChangeEvent<HTMLInputElement>) => {
        setResMsg({ message: `(${e.target.value.length} / 300)`, error: e.target.value.length > 300, pending: false })
        setCommentInput(e.target.value)
    }

    const { comments, err } = useComments(postId)
    const { findUserData } = useUsers()
    const { user } = useAuth()
    const { pusher } = usePusher()

    useEffect(() => {
        if (err)
            setResMsg({ message: err, pending: false, error: true })
        else
            setResMsg({ message: "", error: false, pending: resMsg.pending })
    }, [err])

    const handleMessage = (data:any ) => setResMsg(data)
    const handleBlocked = () => setResMsg({ message: "Too many requests", error: true, pending: false })

    useEffect(() => {
        if (!pusher) return
        const channel = pusher.subscribe(`post=${postId}`)
        channel.bind('message', handleMessage)
        channel.bind('blocked', handleBlocked)
        return () => {
            channel.unbind("message", handleMessage)
            channel.unbind("blocked", handleBlocked)
            pusher.unsubscribe()
        }
    }, [postId])

    const voteOnPostComment = async ({ commentId, isUpvote }: { commentId: string, isUpvote: boolean }) => {
        try {
            await axios({
                method: "PATCH",
                url: `/api/pusher?postId=${postId}&voteOnComment=true`,
                data: { commentId, isUpvote },
                withCredentials: true,
            })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? setResMsg({ message: e.response.data.message, error: true, pending: false }) : setResMsg({ message: `${e}`, pending: false, error: true }))
                    : setResMsg({ message: `${e}`, pending: false, error: true })
            }
        }
    }

    const handleSubmitComment = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        try {
            await axios({
                method: "POST",
                url: `/api/pusher?postId=${postId}`,
                data: { comment: commentInput },
                withCredentials: true,
            })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? setResMsg({ message: e.response.data.message, error: true, pending: false }) : setResMsg({ message: `${e}`, pending: false, error: true }))
                    : setResMsg({ message: `${e}`, pending: false, error: true })
            }
        }
        setCommentInput('')
    }
    const deleteComment = async (commentId: string) => {
        try {
            await axios({
                method: "DELETE",
                url: `/api/pusher?postId=${postId}`,
                data: { commentId },
                withCredentials: true,
            })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? setResMsg({ message: e.response.data.message, error: true, pending: false }) : setResMsg({ message: `${e}`, pending: false, error: true }))
                    : setResMsg({ message: `${e}`, pending: false, error: true })
            }
        }
    }
    const [deleteCommentId, setDeleteCommentId] = useState('')
    const openEditComment = (comment: string) => setEditCommentInput(comment)
    const [editingId, setEditingId] = useState('')
    const [editCommentInput, setEditCommentInput] = useState('')
    const editComment = (commentId: string, comment: string) => {
        if (commentId !== editingId) {
            setEditingId(commentId)
            openEditComment(comment)
        } else
            setEditingId('')
    }
    const handleSubmitCommentEdit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        try {
            await axios({
                method: "PATCH",
                url: `/api/pusher?postId=${postId}`,
                data: { comment: editCommentInput, commentId: editingId },
                withCredentials: true,
            })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? setResMsg({ message: e.response.data.message, error: true, pending: false }) : setResMsg({ message: `${e}`, pending: false, error: true }))
                    : setResMsg({ message: `${e}`, pending: false, error: true })
            }
        }
        setEditingId('')
        setEditCommentInput('')
    }

    const getHasVotedUp = (votes: any) => {
        const matchingVote = (votes) ? votes.find((vote: any) => (vote.uid === user.id)) : false
        return matchingVote ? matchingVote.isUpvote : false
    }

    const getHasVotedDown = (votes: any) => {
        const matchingVote = (votes) ? votes.find((vote: any) => (vote.uid === user.id)) : false
        return matchingVote ? !matchingVote.isUpvote : false
    }

    const getVotes = (votes: any) => {
        let count = 0
        if (!votes) return 0
        votes.forEach((vote: any) => {
            if (vote.isUpvote) count++
            else count--
        })
        return count
    }

    const renderComment = (comment: any, commentId: string) => {
        if (!comments) return ("error")
        return (
            <div key={commentId} className={classes.commentContainer}>
                <div className={classes.commentAndPfp}>
                    <div className={classes.userContainer}><User date={new Date(comment.timestamp)} usersData={findUserData(comment.uid)} /></div>
                    <div key={comment.comment + comment.uid} className={classes.comment}>
                        {editingId === comment.commentId ?
                            <form ref={editCommentFormRef} onSubmit={handleSubmitCommentEdit} className={classes.editComment}>
                                <input className={classes.editCommentInput} onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    setEditCommentInput(e.target.value)
                                }} value={editCommentInput} type="text" required />
                                <AiOutlineEdit onClick={() => editCommentFormRef.current?.requestSubmit()} />
                                <MdClose onClick={() => setEditingId('')} />
                            </form>
                            :
                            <p>{comment.comment}</p>
                        }
                        {comment.updatedAt &&
                            <b>
                                edited {new Date(comment.updatedAt).toLocaleString('en-GB', { timeZone: "UTC" })}
                            </b>
                        }
                    </div>
                </div>
                {
                    user && <div className={classes.icons}>
                        {(editingId !== comment.commentId) && <>{comment.uid === user.id && <div className={classes.actionIcons}>
                            {comment.uid === user.id && <MdEdit onClick={() => editComment(comment.commentId, comment.comment)} />}
                            <MdDeleteForever onClick={() => { setDeleteCommentId(comment.commentId) }} />
                        </div>}
                            <div className={classes.votingIcons}>
                                <BiChevronUp style={getHasVotedUp(comment.votes) ? { filter: "opacity(1) drop-shadow(0px 0px 3px lime)" } : {}} onClick={() => {
                                    if (user)
                                        voteOnPostComment({ commentId: comment.commentId, isUpvote: true })
                                }} />
                                <BiChevronDown style={getHasVotedDown(comment.votes) ? { filter: "opacity(1) drop-shadow(0px 0px 3px red)" } : {}} onClick={() => {
                                    if (user)
                                        voteOnPostComment({ commentId: comment.commentId, isUpvote: false })
                                }} />
                                <div className={classes.numVotes}>
                                    {getVotes(comment.votes)}
                                </div>
                            </div>
                        </>}
                        <div />
                    </div>
                }
            </div >
        )
    }

    return (
        <div className={classes.container}>
            {user ? <div className={classes.commentsDesc}>
                {comments.length > 0 ? `${comments.length} comment${comments.length > 1 ? "s" : ""}` : "No comments"}
            </div>
                :
                <Link href="/register">
                    <div className={classes.commentsDesc}>
                        Register to add a comment ({comments.length && `${comments.length} comment${comments.length > 1 ? "s" : ""}`})
                    </div>
                </Link>
            }
            {comments.length > 0 && <div className={classes.comments}>
                {comments.map((comment: any) => renderComment(comment, comment.commentId)).sort((a: any, b: any) => a.timestamp - b.timestamp)}
                <div className={classes.commentsBottomRef} />
            </div>}
            {user &&
                <form ref={commentFormRef} onSubmit={handleSubmitComment}>
                    <input placeholder="Add a comment..." onChange={handleCommentInput} value={commentInput} type="text" required />
                    <RiMailSendFill className={classes.addCommentButton} onClick={() => {
                        commentFormRef.current?.requestSubmit()
                    }} />
                </form>}
            <p style={resMsg.error ? { color: "red" } : {}}>{resMsg.message}</p>
        </div>
    )
}