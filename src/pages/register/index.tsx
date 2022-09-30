import classes from "../LoginRegister.module.scss"
import formClasses from "../../../styles/FormClasses.module.scss"
import { useFormik } from "formik"
import axios, { AxiosError } from "axios"
import { useState } from "react"
import { IResponseMessage } from "../../interfaces/GeneralInterfaces"
import { useAuth } from "../../context/AuthContext"
import Link from "next/link"
import { FcGoogle } from "react-icons/fc"
import Checkbox from "../../components/checkbox/Checkbox"
import has from "lodash/has"

export default function Register() {
    const [resMsg, setResMsg] = useState<IResponseMessage>({ message: "", error: false, pending: false })

    const { setUser } = useAuth()

    const formik = useFormik({
        initialValues: {
            email: "",
            password: "",
            confirmPassword: "",
            username: "",
            readPolicy: false,
        },
        onSubmit: async (values) => {
            try {
                setResMsg({ message: "Creating account...", pending: true, error: false })
                const res = await axios({
                    method: "POST",
                    url: `/api/register`,
                    data: values
                })
                setUser({ email: values.email, username: values.username })
                setResMsg({ message: res.data.message, error: false, pending: false })
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
                <label>Username</label>
                <input type="text" onChange={formik.handleChange} onBlur={formik.handleBlur} value={formik.values.username} name="username" id="username" />
            </div>
            <div className={formClasses.inputLabelWrapper}>
                <label>Password</label>
                <input type="password" onChange={formik.handleChange} onBlur={formik.handleBlur} value={formik.values.password} name="password" id="password" />
            </div>
            <div className={formClasses.inputLabelWrapper}>
                <label>Confirm password</label>
                <input type="password" onChange={formik.handleChange} onBlur={formik.handleBlur} value={formik.values.confirmPassword} name="confirmPassword" id="confirmPassword" />
            </div>
            <button type="submit">Create account</button>
            <Link href="/api/google">
                <button type="button" className={classes.googleLoginButton}><FcGoogle />Sign in using google</button>
            </Link>
            <div className={classes.checkboxContainer}>
                <label><Link href="/policy">I have read and agree to the cookies and privacy policy</Link></label>
                <Checkbox value={formik.values.readPolicy} setValue={(to: boolean) => formik.setFieldValue('readPolicy', to)} id="policy" />
            </div>
            {resMsg.message && <div className={classes.resMsg}>{resMsg.message}</div>}
        </form>
    )
}