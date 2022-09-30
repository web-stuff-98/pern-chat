import axios, { AxiosError } from "axios"
import { IResponseMessage } from "../../../interfaces/GeneralInterfaces"
import modalClasses from "../ModalShared.module.scss"
import classes from "./Verify.module.scss"
import { useState, useEffect } from "react"
import { useRouter } from "next/router"

export default function Verify() {
    const { query: { emailVerification, email } } = useRouter()

    const [resMsg, setResMsg] = useState<IResponseMessage>({ message: "Verifying...", error: false, pending: true })

    const verifyUser = async () => {
        try {
            const axres = await axios({
                method: "POST",
                url: `/api/verify`,
                data: { emailVerification, email },
            })
            setResMsg({ message: axres.data.message, pending: false, error: false })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                if (e.response)
                    if (e.response.data)
                        //@ts-ignore-error
                        setResMsg({ message: e.response.data.message, error: true, pending: false })
                    else
                        setResMsg({ message: `${e}`, error: true, pending: false })
                else
                    setResMsg({ message: `${e}`, error: true, pending: false })
            }
        }
    }

    useEffect(() => {
        verifyUser()
    }, [])

    return (
        <div className={modalClasses.container}>
            <div className={classes.container}>
                {resMsg.message}
            </div>
        </div>
    )
}