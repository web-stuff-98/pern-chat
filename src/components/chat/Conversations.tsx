import classes from "../../../styles/Chat.module.scss"
import formClasses from "../../../styles/FormClasses.module.scss"
import { useChat } from "../../context/ChatContext"
import { useEffect, useState } from "react"
import type { FormEvent, ChangeEvent } from "react"
import User from "../user/User"
import { useUsers } from "../../context/UsersContext"
import { ChatSection } from "../../enums/ChatEnums"

import { BsChatLeftText } from "react-icons/bs"
import axios from "axios"
import { IResponseMessage } from "../../interfaces/GeneralInterfaces"

import has from "lodash/has"

const Conversations = () => {
    const { conversations, dispatch: cDispatch, getConvs, setSection } = useChat()
    const { findUserData, cacheProfileDataForUser } = useUsers()

    const [resMsg, setResMsg] = useState<IResponseMessage>({ message: "", error: false, pending: false })

    useEffect(() => {
        getConvs()
    }, [])

    const [searchInput, setSearchInput] = useState('')
    const [searchMatchingUIDs, setSearchMatchingUIDs] = useState<number[]>([])
    const handleSearchSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        try {
            const axres = await axios({
                method: "GET",
                url: `/api/user?search=${searchInput.toLowerCase().trim().replaceAll(" ", "-")}`,
                withCredentials: true,
                headers: {
                    "Content-type": "application/json"
                }
            })
            setSearchMatchingUIDs(axres.data.accounts
                .filter((acc: any) => !conversations.includes(acc.id))
                .map((acc: any) => {
                    cacheProfileDataForUser(acc.id)
                    return acc.id
                }))
        } catch (e) {
            if (axios.isAxiosError(e))
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? setResMsg({ message: e.response.data.message, error: true, pending: false }) : setResMsg({ message: `${e}`, pending: false, error: true }))
                    : setResMsg({ message: `${e}`, pending: false, error: true })
        }
    }

    const renderUserConversation = (uid: Number) => {
        return (
            <>
                <User noClick={true} usersData={findUserData(uid)} />
                <div className={classes.icons}>
                    <BsChatLeftText />
                </div>
            </>
        )
    }
    /*<User usersData={userData} />*/

    return (
        <div className={classes.conversationsSection}>
            <div className={classes.list}>
                {(conversations.length > 0 || searchMatchingUIDs.length > 0) ? conversations
                    .concat(searchMatchingUIDs)
                    .map((uid: number) => (
                        <div key={uid} onClick={() => { setSection(ChatSection.CONVERSATION); cDispatch({ conversee: uid }) }} className={classes.user}>
                            {renderUserConversation(uid)}
                        </div>
                    ))
                :
                <div style={{textAlign:"center", width:"100%"}}>
                You aren&apos;t in any conversations - you can click on other users to start a conversation, or search down below for users to start a conversation.
                </div>}
            </div>
            <div className={formClasses.inputLabelWrapper}>
                <form onSubmit={handleSearchSubmit} className={formClasses.inputAndButton}>
                    <input onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)} value={searchInput} placeholder="User name..." type="text" required />
                    <button>Find user</button>
                </form>
            </div>
            {resMsg.message && <p style={{ margin: "auto", textAlign: "center" }}>{resMsg.message}</p>}
        </div>
    )
}

export default Conversations