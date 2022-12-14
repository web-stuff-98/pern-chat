import { Pool } from "pg"

declare global {
    var pool: Pool | any
}

global.pool = global.pool ? global.pool : new Pool({
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DATABASE,
    host: process.env.POSTGRES_HOST,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT),
    max: 5,
})

export default { query: (text: string, values?: any[]) => global.pool.query(text, values) }