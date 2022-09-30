import * as Yup from "yup"
export default Yup.object().shape({
    email: Yup.string()
        .email()
        .max(100, 'Too many characters.')
        .required('Email required')
    ,
    password: Yup.string().required('Password required')
        .max(100, 'Max 100 characters')
    ,
})