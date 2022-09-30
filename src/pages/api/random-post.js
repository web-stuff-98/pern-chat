
import sample from "lodash/sample"
import capitalize from "lodash/capitalize"

import { loremIpsum } from "lorem-ipsum"
import axios from "axios"
import pool from "../../../utils/db"

const getRandomImage = async () => {
    const imgRes = await axios({
        method: "GET",
        url: `https://picsum.photos/${Math.random() * 0.5 > 0 ? "200" : "100"}/${Math.random() * 0.5 > 0 ? "200" : "100"}`,
        headers: { "Content-type": "image/jpeg" },
        responseType: "arraybuffer"
    })
    const bufferString = Buffer.from(imgRes.data, "binary").toString("base64")
    return `<img src="data:image/jpeg;base64, ${bufferString}"/><br/>`
}
const getRandomHTML = async () => {
    const axres = await axios({
        method: "GET",
        url: `https://loripsum.net/api${Math.random() > 0.8 ? (Math.random() * 0.75 > 0 ? (Math.random() * 0.5 > 0 ? "/ul/" : "/ol/") : "") : "/"}${Math.random() > 0.5 ? "link" : ""}${Math.random() * 0.75 > 0 ? "/decorate/" : "/"}${Math.max(2, Math.random() * 3)}`
    })
    return `${axres.data}<br/>`
}

export default async function handler(req, res) {
    const generateRandomPost = async () => {
        const generateRandomTitle = () => `${capitalize(loremIpsum({ count: Math.round(Math.random() * 6) + 4, units: "words" })).substring(0, 90)}`
        const generateRandomHTML = async () => {
            let html = await getRandomHTML()
            if (Math.random() > 0.5)
                html += (await getRandomImage())
            if (Math.random() > 0.5)
                html += await getRandomHTML()
            html += await getRandomHTML()
            if (Math.random() > 0.85)
                html += (await getRandomImage())
            html += await getRandomHTML()
            if (Math.random() > 0.5)
                html += await getRandomHTML()
            if (Math.random() > 0.5)
                html += await getRandomHTML()
            return html
        }
        const generateRandomDescription = () => `${loremIpsum({ count: 3, units: "sentences" })}`.substring(0, 130)
        const generateRandomTags = () => {
            let tags = []
            const randomInt = Math.round(Math.random() * 6) + 1
            let i = 0
            while (i < randomInt) {
                i++
                const randomWord = loremIpsum({ count: 1, units: "word" })
                if (!tags.includes(randomWord))
                    tags.push(randomWord)
            }
            return tags
        }
        const getRandomAuthor = async () => {
            const getProtectedUsersQuery = await pool.query("SELECT id,email FROM account WHERE protected = TRUE;")
            const protectedUserIds = getProtectedUsersQuery.rows.filter((user) => user.email !== process.env.EMAIL).map((user) => user.id)
            return sample(protectedUserIds)
        }
        return {
            title: generateRandomTitle(),
            description: generateRandomDescription(),
            content: (`<h1>${capitalize(loremIpsum({ count: Math.round((Math.random() * 5) + 5), units: "words" }))}</h1>` + await generateRandomHTML()),
            owner: (await getRandomAuthor()),
            pinned: (Math.random() > 0.95),
            active: (Math.random() > 0.05),
            tags: generateRandomTags(),
        }
    }

    try {
        const randomPost = await generateRandomPost()
        return res.json(randomPost)
    } catch (e) {
        res.status(400).json({ message: e })
    }
}
