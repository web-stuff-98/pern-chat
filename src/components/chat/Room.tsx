import classes from "../../../styles/Chat.module.scss"
import formClasses from "../../../styles/FormClasses.module.scss"
import { useChat } from "../../context/ChatContext"
import { useRef, useState } from "react"
import type { FormEvent, ChangeEvent } from "react"
import { useUsers } from "../../context/UsersContext"
import { Message } from "../../pages/chat"
import { AiFillFile, AiFillFileAdd, AiOutlineEdit } from "react-icons/ai"
import { MdClose, MdDeleteForever, MdOutlineEdit, MdSend } from "react-icons/md"
import axios, { AxiosError, AxiosRequestConfig } from "axios"
import has from "lodash/has"
import User from "../user/User"
import { useAuth } from "../../context/AuthContext"
import ProgressBar from "../progressBar/ProgressBar"
import useAttachmentViewer from "../../context/AttachmentViewerContext"

type EditingMessageState = {
    editing: boolean,
    msg: Message,
    newMsg: string
}

export default function Room() {
    const { findUserData } = useUsers()
    const { roomMessages, state: cState, dispatch: cDispatch } = useChat()
    const { openAttachedFile } = useAttachmentViewer()

    const [roomMessageInput, setRoomMessageInput] = useState('')
    const handleSubmitMessageForm = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        await submitMessage(roomMessageInput, file)
    }
    const submitMessage = async (message: string, file?: File) => {
        try {
            cDispatch({ resMsg: { message: "", error: false, pending: true } })
            const axres = await axios({
                method: "POST",
                url: `/api/pusher?roomId=${cState.room.id}`,
                data: { action: "add-room-message", message },
                withCredentials: true,
            })
            if (file) {
                const formData = new FormData()
                formData.append("file", file)
                const axiosConfig: AxiosRequestConfig = {
                    onUploadProgress: (progressEvent) => cDispatch({ attachmentProgress: (Math.round((progressEvent.loaded * 100) / progressEvent.total)) })
                }
                await axios.post(`/api/attachment?roomId=${cState.room.id}&msgId=${axres.data.msgId}`, formData, axiosConfig)
            }
            cDispatch({ resMsg: { message: axres.data.message, error: false, pending: false } })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? cDispatch({ resMsg: { message: e.response.data.message, error: true, pending: false } }) : cDispatch({ resMsg: { message: `${e}`, pending: false, error: true } }))
                    : cDispatch({ resMsg: { message: `${e}`, pending: false, error: true } })
            }
        }
    }

    const [editingMessage, setEditingMessage] = useState<EditingMessageState>({
        editing: false,
        msg: { message: "", id: "", author: 0, timestamp: 0 },
        newMsg: ""
    })

    const { user } = useAuth()

    const submitMessageEdit = async () => {
        try {
            await axios({
                method: "PATCH",
                url: `/api/pusher?roomId=${cState.room.id}`,
                withCredentials: true,
                data: {
                    action: "edit-room-message",
                    message: editingMessage.newMsg,
                    msgId: editingMessage.msg.id
                }
            })
            setRoomMessageInput("")
            setFile(undefined)
            setEditingMessage({ ...editingMessage, editing: false })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? cDispatch({ resMsg: { message: e.response.data.message, error: true, pending: false } }) : cDispatch({ resMsg: { message: `${e}`, pending: false, error: true } }))
                    : cDispatch({ resMsg: { message: `${e}`, pending: false, error: true } })
            }
        }
    }

    const deleteMessage = async (msgId: string) => {
        try {
            await axios({
                method: "DELETE",
                url: `/api/pusher?roomId=${cState.room.id}`,
                withCredentials: true,
                data: {
                    action: "delete-room-message",
                    msgId
                }
            })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? cDispatch({ resMsg: { message: e.response.data.message, error: true, pending: false } }) : cDispatch({ resMsg: { message: `${e}`, pending: false, error: true } }))
                    : cDispatch({ resMsg: { message: `${e}`, pending: false, error: true } })
            }
        }
    }

    const handleSubmitMessageEdit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        submitMessageEdit()
    }
    const editCommentFormRef = useRef<HTMLFormElement>(null)
    const renderMessage = (msg: Message, isEditing: boolean) => {
        return (
            <>
                {isEditing ?
                    <form onSubmit={handleSubmitMessageEdit} ref={editCommentFormRef}>
                        <input onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setEditingMessage({ ...editingMessage, newMsg: e.target.value })
                        }} value={editingMessage.newMsg} className={classes.editInput} />
                        <div className={classes.icons}>
                            <MdOutlineEdit onClick={() => editCommentFormRef.current?.requestSubmit()} />
                            <MdClose style={{ background: "red" }} onClick={() => setEditingMessage({ msg: { message: "", author: 0, timestamp: 0, id: "" }, editing: false, newMsg: "" })} />
                        </div>
                    </form>
                    :
                    <>
                        <User date={new Date(msg.timestamp)} usersData={findUserData(msg.author)} />
                        <div className={classes.text}>
                            {msg.message}
                        </div>
                        {msg.hasAttachment && <div style={{ marginRight: "2px", }} className={classes.icons}>
                            <AiFillFile onClick={() => {
                                openAttachedFile(msg.id, msg.attachmentMimeType)
                            }} style={{ background: "green" }} />
                        </div>}
                        {user && user.id === msg.author && <div className={classes.icons}>
                            <AiOutlineEdit onClick={() => setEditingMessage({
                                editing: true, msg, newMsg: msg.message
                            })} />
                            <MdDeleteForever style={{ background: "red" }} onClick={() => deleteMessage(msg.id)} />
                        </div>}
                    </>}
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
        <div className={classes.roomSection}>
            {cState.room && <>
                <div style={cState.room.base64coverImage ? { backgroundImage: `url(${cState.room.base64coverImage})` } : {}}
                    className={cState.room.base64coverImage ? classes.headingWithImage : classes.heading}>
                    <div className={classes.inner}>
                        {cState.room.name}
                    </div>
                </div>
                <div className={classes.list}>
                    {roomMessages.map((msg: Message) => <div key={msg.id} className={classes.message}>{renderMessage(msg, editingMessage.msg === msg && editingMessage.editing)}</div>)}
                </div>
                <form onSubmit={handleSubmitMessageForm} className={formClasses.inputLabelWrapper}>
                    <div className={formClasses.inputAndButton}>
                        <input placeholder="Add a message..." onChange={(e: ChangeEvent<HTMLInputElement>) => { e.preventDefault(); setRoomMessageInput(e.target.value) }} value={roomMessageInput} type="text" required />
                        <input accept=".jpg,.jpeg,.gif,.png,.bmp,.avi,.mp4" ref={hiddenFileInputRef} onChange={handleFileInput} style={{ display: "none" }} type="file" />
                        <button type="submit" style={{ display: "flex", alignItems: "center" }}><MdSend style={{ fill: "white" }} /></button>
                        <button type="button" onClick={() => { if (!file) { hiddenFileInputRef.current?.click() } else setFile(undefined) }} style={{
                            display: "flex", alignItems: "center",
                            ...(file ? {
                                background: "red"
                            } : {})
                        }}><AiFillFileAdd style={{ fill: "white" }} /></button>
                    </div>
                    {file && !cState.resMsg.pending && <b style={{ textAlign: "center", paddingTop: "var(--padding-base)" }}>Attachment : {file.name}</b>}
                    {file && cState.resMsg.pending && <div style={{ marginTop: "var(--padding-base)" }}><ProgressBar percent={cState.attachmentProgress} /></div>}
                </form>
            </>}
        </div >
    )
}