import rateLimit from "express-rate-limit"
import slowDown from "express-slow-down"

//https://kittygiraudel.com/2022/05/16/rate-limit-nextjs-api-routes/

const getIP = req =>
    req.ip ||
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress

const getRateLimitMiddlewares = ({ limit = 10, windowMs = 60 * 1000, delayAfter = Math.round(10 / 2), delayMs = 500, } = {}) => [slowDown({ keyGenerator: getIP, windowMs, delayAfter, delayMs }), rateLimit({ keyGenerator: getIP, windowMs, max: limit }),]

export default getRateLimitMiddlewares