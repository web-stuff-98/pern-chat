import classes from "../LoginRegister.module.scss"
import formClasses from "../../../styles/FormClasses.module.scss"
import { useFormik } from "formik"
import axios, { AxiosError } from "axios"
import { useState } from "react"
import { IResponseMessage } from "../../interfaces/GeneralInterfaces"
import { useAuth } from "../../context/AuthContext"
import { FcGoogle } from "react-icons/fc"
import Link from "next/link"
import { useRouter } from "next/router"
import has from "lodash/has"

export default function Login() {
    const [resMsg, setResMsg] = useState<IResponseMessage>({ message: "", error: false, pending: false })

    const { setUser } = useAuth()

    const router = useRouter()

    const formik = useFormik({
        initialValues: {
            email: "",
            password: "",
        },
        onSubmit: async (values) => {
            try {
                setResMsg({ message: "Logging in...", pending: true, error: false })
                const res = await axios({
                    method: "POST",
                    url: `/api/login`,
                    data: values
                })
                setUser(res.data.user)
                setResMsg({ message: res.data.message, error: false, pending: false })
                router.push("/")
            } catch (e: AxiosError | any) {
                if (axios.isAxiosError(e)) {
                    e.response ?
                        //@ts-ignore-error
                        (has(e.response, "data") ? setResMsg({ message: e.response.data.message, error: true, pending: false }) : setResMsg({ message: `${e}`, pending: false, error: true }))
                        : setResMsg({ message: `${e}`, pending: false, error: true })
                }
            }
        }
    })

    return (
        <form onSubmit={formik.handleSubmit} className={classes.container}>
            <div className={formClasses.inputLabelWrapper}>
                <label>Email</label>
                <input type="text" onChange={formik.handleChange} onBlur={formik.handleBlur} value={formik.values.email} name="email" id="email" />
            </div>
            <div className={formClasses.inputLabelWrapper}>
                <label>Password</label>
                <input type="password" onChange={formik.handleChange} onBlur={formik.handleBlur} value={formik.values.password} name="password" id="password" />
            </div>
            <button type="submit">Login</button>
            <Link href="/api/google">
                <button type="button" className={classes.googleLoginButton}><FcGoogle />Sign in using google</button>
            </Link>
            {resMsg.message && <div className={classes.resMsg}>{resMsg.message}</div>}
        </form>
    )
}
