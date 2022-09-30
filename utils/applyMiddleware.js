
//https://nextjs.org/docs/api-routes/request-helpers
//how to apply express middlewares (avoid edge functions, use node)
const applyMiddleware = middleware => (req, res) => {
    new Promise((resolve, reject) => {
        middleware(req, res, result => {
            result instanceof Error ? reject(result) : resolve(result)
        })
    })
}
export default applyMiddleware