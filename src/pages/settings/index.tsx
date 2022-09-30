import classes from "./Settings.module.scss"
import formClasses from "../../../styles/FormClasses.module.scss"

import { useState, useRef, useEffect } from "react"
import type { ChangeEvent, FormEvent } from "react"

import { FiSettings } from "react-icons/fi"
import axios, { AxiosError } from "axios"
import { IResponseMessage } from "../../interfaces/GeneralInterfaces"

import has from "lodash/has"
import { useAuth } from "../../context/AuthContext"
import { useInterface } from "../../context/InterfaceContext"

export default function Settings() {
    const { user } = useAuth()

    const [base64pfp, setBase64pfp] = useState('')

    const { state: iState } = useInterface()

    const [resMsg, setResMsg] = useState<IResponseMessage>({ message: "", error: false, pending: false })

    const handlePfpInput = (e: ChangeEvent<HTMLInputElement>) => {
        //@ts-ignore-error
        if (!e.target.files[0]) return
        const fr = new FileReader()
        //@ts-ignore-error
        fr.readAsDataURL(e.target.files[0]!)
        fr.onloadend = () => {
            setResMsg({ message: "Press update profile picture to confirm.", error: false, pending: false })
            setBase64pfp(String(fr.result))
        }
    }

    const handlePfpForm = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        await uploadPfp()
    }

    const uploadPfp = async () => {
        try {
            const axres = await axios({
                method: "POST",
                url: `/api/pfp`,
                withCredentials: true,
                data: {
                    base64pfp
                }
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

    const getPfp = async () => {
        try {
            const axres = await axios({
                method: "GET",
                url: `/api/pfp?id=${user.id}`,
                headers: { "Content-type": "image/jpeg", },
                responseType: "blob"
            })
            const fr = new FileReader()
            fr.readAsDataURL(axres.data)
            fr.onloadend = () => setBase64pfp(`${fr.result}`)
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? setResMsg({ message: e.response.data.message, error: true, pending: false }) : setResMsg({ message: `${e}`, pending: false, error: true }))
                    : setResMsg({ message: `${e}`, pending: false, error: true })
            }
        }
    }

    useEffect(() => { getPfp() }, [])


    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
    const handleUpdatePassword = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        try {
            const axres = await axios({
                method: "POST",
                url: "/api/user?updatePass=true",
                data: { currentPassword, newPassword, newPasswordConfirm },
                withCredentials: true,
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

    const hiddenPfpInputRef = useRef<HTMLInputElement>(null)
    return (
        <div className={classes.container}>
            <h1 className={classes.heading}>
                <FiSettings /> Settings
            </h1>
            <form onSubmit={handlePfpForm} className={classes.pfpInputContainer}>
                <span style={base64pfp ? {
                    backgroundImage: `url(${base64pfp})`
                } : {
                    backgroundImage: `url(pfp${iState.darkMode ? "_dark" : ""}.jpg)`
                }} onClick={() => hiddenPfpInputRef.current?.click()} className={classes.pfp} />
                <h3>{user && user.username}</h3>
                <input id="hiddenPfpInput" onChange={handlePfpInput} ref={hiddenPfpInputRef} type="file" required />
                <label htmlFor="hiddenPfpInput">Click on your profile picture to select a new one and press the update button below to submit it.</label>
                <button type="submit">Update profile picture</button>
            </form>
            <form onSubmit={handleUpdatePassword} className={classes.changePasswordForm}>
                <div className={formClasses.inputLabelWrapper}>
                    <label>Current password</label>
                    <input onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)} type="password" required />
                </div>
                <div className={formClasses.inputLabelWrapper}>
                    <label>New password</label>
                    <input onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)} type="password" required />
                </div>
                <div className={formClasses.inputLabelWrapper}>
                    <label>Confirm new password</label>
                    <input onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPasswordConfirm(e.target.value)} type="password" required />
                </div>
                <button type="submit">Change password</button>
            </form>
            {resMsg.message && <b style={{ textAlign: "center" }}>{resMsg.message}</b>}
        </div>
    )
}

Settings.requiresAuth = true
