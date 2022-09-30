import classes from "../../../styles/Chat.module.scss"
import { useChat } from "../../context/ChatContext"
import { ChatSection } from "../../enums/ChatEnums"

export default function Menu() {
    const { setSection } = useChat()

    return (
        <div className={classes.menuSection}>
            <button type="button" onClick={() => setSection(ChatSection.ROOM_LIST)}>Rooms</button>
            <button type="button" onClick={() => setSection(ChatSection.CONVERSATIONS)}>Conversations</button>
            {/*<button type="button" onClick={() => setSection(ChatSection.VIDEO_ROOM_LIST)}>Video Rooms</button>*/}
        </div>
    )
}