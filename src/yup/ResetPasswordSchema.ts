import * as Yup from "yup"
import YupPassword from "yup-password"
YupPassword(Yup)
export default Yup.object().shape({
    currentPassword: Yup.string()
        .required('Current password required')
    ,
    newPassword: Yup.string().required('Password required')
        .min(8, 'Password must contain 8 or more characters')
        .minLowercase(1, 'Password must contain ast least 1 lowercase character')
        .minUppercase(1, 'Password must contain at least one uppercase character')
        .minSymbols(1, 'Password must contain at least 1 special character')
        .max(100, 'Max 100 characters')
    ,
    newPasswordConfirm: Yup.string().required()
})