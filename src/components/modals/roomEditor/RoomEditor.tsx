import modalClasses from "../ModalShared.module.scss"
import classes from "./RoomEditor.module.scss"

import { useState, useRef } from "react"
import type { ChangeEvent, FormEvent } from "react"
import axios, { AxiosError } from "axios"
import { IResponseMessage } from "../../../interfaces/GeneralInterfaces"
import { useChat } from "../../../context/ChatContext"

import has from "lodash/has"

export default function RoomEditor() {
    const [coverImageFile, setCoverImageFile] = useState<File>()
    const [coverImageBase64, setCoverImageBase64] = useState('')

    const [resMsg, setResMsg] = useState<IResponseMessage>({ message: "", error: false, pending: false })

    const { state: cState } = useChat()

    const handleCoverImageInput = (e: ChangeEvent<HTMLInputElement>) => {
        //@ts-ignore-error
        if(!e.target.files[0]) return
        //@ts-ignore-error
        setCoverImageFile(e.target.files[0])
        const fr = new FileReader()
        //@ts-ignore-error
        fr.readAsDataURL(e.target.files[0])
        fr.onloadend = () => setCoverImageBase64(`${fr.result}`)
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        try {
            setResMsg({ message: "Updating cover image...", pending: true, error: false })
            await axios({
                method: "POST",
                url: "/api/roomImage",
                data: {
                    roomName: cState.editingRoom.roomName,
                    base64img: coverImageBase64
                }
            })
            setResMsg({ message: "Cover image updated", error: false, pending: false })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? setResMsg({ resMsg: { message: e.response.data.message, error: true, pending: false } }) : setResMsg({ message: `${e}`, pending: false, error: true }))
                    : setResMsg({ message: `${e}`, pending: false, error: true })
            }
        }
    }

    const hiddenFileInputRef = useRef<HTMLInputElement>(null)
    return (
        <div className={modalClasses.container}>
            <form onSubmit={handleSubmit} className={classes.container}>
                <h1>Editing : {cState.editingRoom.roomName}</h1>
                {coverImageBase64 && <div style={{ backgroundImage: `url(${coverImageBase64})` }} className={classes.coverImage} />}
                <input ref={hiddenFileInputRef} onChange={handleCoverImageInput} type="file" />
                <button type="button" onClick={() => hiddenFileInputRef.current?.click()}>Select cover image</button>
                <button type="submit">Update</button>
                {resMsg.message && <hr/>}
                {resMsg.message && <b style={{padding:"var(--padding-base)"}}>{resMsg.message}</b>}
            </form>
        </div>
    )
}