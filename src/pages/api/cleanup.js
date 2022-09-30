/**
 * Cleanup function API route
 */
import pool from '../../../utils/db'
import pusher from '../../../utils/pusher'
import cloudinary from "cloudinary"

cloudinary.v2.config({
    cloud_name: "dzpzb3uzn",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default async function (req, res) {
    if (req.method !== "GET") return res.status(405).end()
    try {
        await cleanup()
    } catch (e) {
        return res.status(500).end(e)
    }
    return res.status(200).end()
}

const cleanup = async () => {
    try {
        const twentyMinutesAgo = Date.now() - 1200000
        let deleteRoomIds = []
        ////// remove accounts older than 20 minutes, aside from the example accounts
        ////// the users rooms and conversations are also going to be deleted
        const getOldAccountsQuery = await pool.query("SELECT id FROM account WHERE timestamp < $1 AND protected = FALSE;", [twentyMinutesAgo])
        const deletedAccountIds = getOldAccountsQuery.rows.map((acc) => acc.id)
        for await (const id of deletedAccountIds) {
            await pool.query("DELETE FROM account WHERE id=$1;", [id])
            await pool.query("DELETE FROM pfp WHERE owner=$1;", [id])
            const usersRoomsQuery = await pool.query("SELECT id FROM room WHERE owner = $1", [id])
            deleteRoomIds = deleteRoomIds.concat(usersRoomsQuery.rows.map((room) => room.id))
            break
        }

        ////// delete rooms made by deleted accounts
        for await (const id of deleteRoomIds) {
            const deleteQuery = await pool.query("DELETE FROM room WHERE id=$1 RETURNING name;", [id])
            await pool.query("DELETE FROM roomImage WHERE room=$1;", [id])
            await pusher.trigger("rooms", "room-deleted", { roomName: deleteQuery.rows[0].name })
            break
        }

        ////// remove old chatroom messages and chatroom messages made by deleted accounts
        const getRoomsQuery = await pool.query("SELECT id FROM room;")
        const roomIds = getRoomsQuery.rows.map((room) => room.id)
        for await (const id of roomIds) {
            const getRoomMessagesQuery = await pool.query("SELECT DISTINCT messages FROM room WHERE id=$1;", [id])
            let messages = getRoomMessagesQuery.rows[0].messages
            if (messages) {
                let deleteMessageIds = []
                messages.forEach(async (message) => {
                    //delete message if its older than 20 minutes or made by a deleted account
                    if (Number(message.timestamp) < (twentyMinutesAgo) || deletedAccountIds.includes(Number(message.author))) {
                        deleteMessageIds.push(message.id)
                        await new Promise((resolve, reject) => {
                            cloudinary.v2.uploader.destroy(`pern-chat/attachments${process.env.NODE_ENV === "development" ? "/dev" : ""}/${message.id}`)
                                .then((res) => resolve(res))
                                .catch((e) => reject(e))
                        })
                        await pusher.trigger(`room=${id}`, "room-message-deleted", { msgId: message.id })
                    }
                })
                messages = messages.filter((message) => !deleteMessageIds.includes(message.id))
                await pool.query("UPDATE room SET messages = $1::JSONB[] WHERE id=$2;", [messages, id])
            }
            break
        }

        ////// remove conversations with deleted accounts and remove their messages
        for await (const id of deletedAccountIds) {
            const findConversationsQuery = await pool.query("SELECT id FROM account WHERE conversations = ANY($1);", [id])
            //remove deleted user id from account conversations
            await pool.query("UPDATE account SET conversations = ARRAY_REMOVE(conversations, $1);", [id])
            const conversees = findConversationsQuery.rows.map(acc => acc.id)
            for await (const uid of conversees) {
                const getInboxQuery = await pool.query("SELECT inbox FROM account WHERE id=$1;", [uid])
                let inbox = getInboxQuery.rows[0].inbox
                const msgIds = inbox.messages.map(msg => Number(msg.author) === id)
                inbox.messages = inbox.messages.filter(msg => !msgIds.includes(msg.id))
                await pool.query("UPDATE account SET inbox = $1::JSONB WHERE id=$2", [inbox, uid])
                msgIds.forEach(async (msgId) => {
                    await new Promise((resolve, reject) => {
                        cloudinary.v2.uploader.destroy(`pern-chat/attachments${process.env.NODE_ENV === "development" ? "/dev" : ""}/${msgId}`)
                            .then((res) => resolve(res))
                            .catch((e) => reject(e))
                    })
                })
                break
            }
            break
        }

        ////// remove old posts
        const deleteQuery = await pool.query("DELETE FROM post WHERE timestamp < $1::BIGINT AND protected = FALSE RETURNING id", [twentyMinutesAgo])
        const deletedPostsIds = deleteQuery.rows.map((p) => p.id)
        if(deletedPostsIds.length > 0)
        for await (const id of deletedPostsIds) {
            await new Promise((resolve, reject) => {
                cloudinary.v2.uploader.destroy(`pern-chat/posts${process.env.NODE_ENV === "development" ? "/dev" : ""}/${id}`)
                    .then((res) => resolve(res))
                    .catch((e) => reject(e))
            })
            break
        }
    } catch (e) {
        console.error(e)
    }
}