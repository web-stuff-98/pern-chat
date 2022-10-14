module.exports.cleanUp = async (pool, cloudinary, pusher) => {
    try {
        //const twentyMinutesAgo = Date.now() - 1200
        const twentyMinutesAgo = Date.now() - 1200
        let deleteRoomIds = []

        ////// remove accounts older than 20 minutes, aside from the example accounts
        ////// the users rooms are also going to be deleted
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

        ////// remove old messages and messages made by deleted users from rooms and delete attachments
        const getRoomsQuery = await pool.query("SELECT id FROM room;")
        const roomIds = getRoomsQuery.rows.map((room) => room.id)
        await Promise.all(roomIds.map(async (id) => {
            const getRoomMessagesQuery = await pool.query("SELECT messages FROM room WHERE id=$1;", [id])
            let messages = getRoomMessagesQuery.messages
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
                messages.filter((message) => !deleteMessageIds.includes(message.id))
                await pool.query("UPDATE room SET messages = $1::JSONB[] WHERE id=$2;", [messages, id])
            }
        }))
    } catch (e) {
        console.error(e)
    }
}