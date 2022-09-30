import passport from "passport"
import "../../../../utils/passport"

export default async function (req, res, next) {
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
    })(req, res, next)
}