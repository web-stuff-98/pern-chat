import { Pool } from "pg"

declare global {
    var pool: Pool | any
}

global.pool = global.pool ? global.pool : new Pool(process.env.NODE_ENV !== "development" ? {
    connectionString: process.env.POSTGRES_DB_URI,
    password: process.env.POSTGRES_PASSWORD,
    max: 2,
} : {
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DATABASE,
    host: process.env.POSTGRES_HOST,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT),
    max: 2,
})

export default { query: (text: string, values?: any[]) => global.pool.query(text, values) }