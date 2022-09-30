import passport from "passport"
import { setCookie } from 'cookies-next'
import "../../../../utils/passport"

export default async function (req, res, next) {
    passport.authenticate('google', (err, user, info) => {
        if (err || !user) res.redirect(process.env.NODE_ENV === "development" ? "http://localhost:3000/" : `https://${process.env.DOMAIN}/` + '?a=auth_fail')
        setCookie('token', info.token, {
            req, res, httpOnly: true,
            secure: process.env.NODE_ENV === "development" ? false : true,
            sameSite: "strict"
        });
        res.redirect(process.env.NODE_ENV === "development" ? "http://localhost:3000/" : `https://${process.env.DOMAIN}/`)
    })(req, res, next)
}

