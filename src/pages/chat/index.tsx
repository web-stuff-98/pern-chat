import classes from "../../../styles/Chat.module.scss"
import { ChatSection } from "../../enums/ChatEnums"
import { useChat } from "../../context/ChatContext"
import Menu from "../../components/chat/Menu"
import RoomList from "../../components/chat/RoomList"
import Room from "../../components/chat/Room"
import Conversations from "../../components/chat/Conversations"
import Conversation from "../../components/chat/Conversation"
import VideoRoomList from "../../components/chat/VideoRoomList"
import VideoRoom from "../../components/chat/VideoRoom"

export type Message = {
    author: number,
    message: string,
    timestamp: number,
    id: string,
    hasAttachment?: boolean,
    attachmentPending?: boolean,
    attachmentMimeType?: string
}

export type ChatRoom = {
    owner: number,
    name: string,
    timestamp: number,
    messages: Message[],
    base64coverImage?: string
}

export default function Chat() {
    const { state: cState, setSection } = useChat()
    return (
        <div className={classes.container}>
            {{
                [ChatSection.MENU]: <Menu />,
                [ChatSection.ROOM_LIST]: <RoomList />,
                [ChatSection.ROOM]: <Room />,
                [ChatSection.CONVERSATIONS]: <Conversations />,
                [ChatSection.CONVERSATION]: <Conversation />,
                [ChatSection.VIDEO_ROOM_LIST]: <VideoRoomList />,
                [ChatSection.VIDEO_ROOM]: <VideoRoom />,
            }[cState.section.currentSection]}
            {cState.section.currentSection !== ChatSection.MENU && <hr />}
            {(cState.section.currentSection !== ChatSection.MENU) && <div className={classes.bottomButtons}>
                {cState.section.lastSection !== cState.section.currentSection && < button onClick={() => {
                    setSection(cState.section.lastSection)
                }} className={classes.bottomButton}>Back</button>}
                <button onClick={() => {
                    setSection(ChatSection.MENU)
                }} className={classes.bottomButton}>Menu</button>
            </div>}
            {cState.resMsg.message && <b style={{ textAlign: "center" }}>{cState.resMsg.message}</b>}
        </div >
    )
}

Chat.requiresAuth = true