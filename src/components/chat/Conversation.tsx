import classes from "../../../styles/Chat.module.scss"
import formClasses from "../../../styles/FormClasses.module.scss"

import { MdSend } from "react-icons/md"
import { AiFillFileAdd } from "react-icons/ai"

import type { ChangeEvent, FormEvent } from "react"
import { useState, useEffect, useRef } from "react"

import has from "lodash/has"
import axios, { AxiosRequestConfig } from "axios"
import { IResponseMessage } from "../../interfaces/GeneralInterfaces"
import { useChat } from "../../context/ChatContext"
import { Message } from "../../pages/chat"

import User from "../user/User"
import { useUsers } from "../../context/UsersContext"
import ProgressBar from "../progressBar/ProgressBar"
import useAttachmentViewer from "../../context/AttachmentViewerContext"

export default function Conversation() {
    const [messageInput, setMessageInput] = useState('')
    const { openAttachedFile } = useAttachmentViewer()
    const [resMsg, setResMsg] = useState<IResponseMessage>({ message: "", error: false, pending: false })
    const { state: cState, dispatch: cDispatch, inboxMessages, getConv, addConvMessage } = useChat()
    const { findUserData } = useUsers()

    const handleSubmitMessageForm = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        await submitMessage()
    }

    const submitMessage = async () => {
        try {
            cDispatch({ resMsg: { message: "", error: false, pending: true } })
            const axres = await axios({
                method: "POST",
                url: `/api/pusher?userId=${cState.conversee}`,
                withCredentials: true,
                data: { action: "message-user", message: messageInput }
            })
            if (file) {
                const formData = new FormData()
                formData.append("file", file)
                const axiosConfig: AxiosRequestConfig = {
                    onUploadProgress: (progressEvent) => cDispatch({ attachmentProgress: (Math.round((progressEvent.loaded * 100) / progressEvent.total)) })
                }
                await axios.post(`/api/attachment?userId=${cState.conversee}&msgId=${axres.data.msgId}`, formData, axiosConfig)
            }
            cDispatch({ resMsg: { message: axres.data.message, error: false, pending: false } })
            setMessageInput("")
            setFile(undefined)
            addConvMessage(messageInput, file ? true : false, file ? file?.type : "")
        } catch (e) {
            if (axios.isAxiosError(e))
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? setResMsg({ message: e.response.data.message, error: true, pending: false }) : setResMsg({ message: `${e}`, pending: false, error: true }))
                    : setResMsg({ message: `${e}`, pending: false, error: true })
        }
    }

    useEffect(() => {
        getConv()
    }, [])

    const renderMessage = (msg: Message) => {
        return (
            <>
                <User noClick={true} date={new Date(msg.timestamp)} usersData={findUserData(msg.author)} />
                <div style={{ flexGrow: "1", margin: "auto", padding: "var(--padding-base)" }}>
                    {msg.message}
                </div>
                {msg.hasAttachment && <div style={{ marginRight: "2px", }} className={classes.icons}>
                    <AiFillFileAdd onClick={() => {
                        openAttachedFile(msg.id, msg.attachmentMimeType)
                    }} style={{ background: "green" }} />
                </div>}
            </>
        )
    }

    ////////////////// File attachment
    const [file, setFile] = useState<File>()
    const hiddenFileInputRef = useRef<HTMLInputElement>(null)
    const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
        //@ts-ignore-error
        if (!e.target.files[0]) return
        //@ts-ignore-error
        setFile(e.target.files[0])
    }

    return (
        <div className={classes.conversationSection}>
            <div>
                <div className={classes.heading}>
                    <div className={classes.inner}>
                        Conversation
                    </div>
                </div>
                <div className={classes.list}>
                    {inboxMessages.map((msg: Message) => <div key={msg.id} className={classes.message}>{renderMessage(msg)}</div>)}
                </div>
                <form onSubmit={handleSubmitMessageForm} className={formClasses.inputLabelWrapper}>
                    <div className={formClasses.inputAndButton}>
                        <input placeholder="Send a message..." onChange={(e: ChangeEvent<HTMLInputElement>) => { e.preventDefault(); setMessageInput(e.target.value) }} value={messageInput} type="text" required />
                        <input accept=".jpg,.jpeg,.gif,.png,.bmp,.avi,.mp4" ref={hiddenFileInputRef} onChange={handleFileInput} style={{ display: "none" }} type="file" />
                        <button type="submit"><MdSend style={{ fill: "white" }} /></button>
                        <button style={file ? {
                            background: "red"
                        } : {}} onClick={() => { if (!file) { hiddenFileInputRef.current?.click() } else { setFile(undefined) } }} type="button"><AiFillFileAdd style={{ fill: "white" }} /></button>
                    </div>
                </form>
                {file && !cState.resMsg.pending && <b style={{ textAlign: "center", paddingTop: "var(--padding-base)", width: "100%" }}>Attachment : {file.name}</b>}
                {file && cState.resMsg.pending && <div style={{ marginTop: "var(--padding-base)" }}><ProgressBar percent={cState.attachmentProgress} /></div>}
            </div>
        </div >
    )
}