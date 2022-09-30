import axios, { AxiosError } from "axios"

import { useState, useEffect } from "react"
import { usePusher } from "../src/context/PusherContext"
import { useUsers } from "../src/context/UsersContext"

const useComments = (postId: number) => {
    const [comments, setComments] = useState([])
    const [err, setErr] = useState('')

    const { pusher } = usePusher()

    const { cacheProfileDataForUser } = useUsers()

    const fetchComments = async () => {
        try {
            const axres = await axios({
                method: "GET",
                headers: { "Content-type": "application/json;charset=UTF-8" },
                url: `/api/post?postId=${postId}&comments=true`
            })
            setComments(axres.data)
            axres.data.forEach((comment: any) => cacheProfileDataForUser(comment.uid))
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                if (e.response)
                    if (e.response.data)
                        //@ts-ignore-error
                        setErr(e.response.data.message)
                    else
                        setErr(`${e}`)
                else
                    setErr(`${e}`)
            }
        }
    }
    useEffect(() => {
        fetchComments()
    }, [])
    useEffect(() => {
        if (!pusher) return
        const channel = pusher.subscribe(`post=${postId}`)
        channel.bind('post-comment-added', (data: any) => {
            //@ts-ignore-error
            setComments(oldComments => [...oldComments, data])
            cacheProfileDataForUser(data.uid)
        })
        channel.bind('post-comment-updated', (data: any) => {
            //@ts-ignore-error
            setComments(oldComments => [...oldComments.filter((comment) => comment.commentId !== data.commentId), data])
        })
        channel.bind('post-comment-deleted', (data: any) => {
            //@ts-ignore-error
            setComments(oldComments => [...oldComments.filter((comment) => comment.commentId !== data.commentId)])
        })
        channel.bind('post-update-comment-votes', ({ commentId, votes }: { commentId: string, votes: any[] }) => {
            //@ts-ignore-error
            setComments(oldComments => {
                let newComments = oldComments
                const i = newComments.findIndex((comment: any) => (commentId === comment.commentId))
                if (i === -1) return oldComments
                //@ts-ignore-error
                newComments[i].votes = votes
                return newComments
            })
        })
        return () => pusher.unsubscribe(`post=${postId}`)
    }, [pusher])

    return { comments, err }
}

export default useComments