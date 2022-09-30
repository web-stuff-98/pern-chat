import { AiOutlineEdit } from "react-icons/ai"
import { BsDoorOpenFill } from "react-icons/bs"
import classes from "../../../styles/Chat.module.scss"
import formClasses from "../../../styles/FormClasses.module.scss"

import { useChat } from "../../context/ChatContext"
import { ChatRoom } from "../../pages/chat"
import { useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { MdDeleteForever } from "react-icons/md"
import { useModal } from "../../context/ModalContext"
import { EModalType } from "../../enums/GeneralEnums"
import { useAuth } from "../../context/AuthContext"

export default function RoomList() {
    const { dispatch: mDispatch } = useModal()
    const { createJoinRoom, rooms, deleteRoom, openRoomEditor } = useChat()
    const { user } = useAuth()

    const [joinRoomNameInput, setJoinRoomNameInput] = useState('')
    const handleCreateJoinRoom = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        await createJoinRoom(joinRoomNameInput)
    }

    return (
        <div className={classes.roomListSection}>
            <div className={classes.list}>
                {rooms.sort((a: any, b: any) => a.timestamp - b.timestamp).map((room: ChatRoom) =>
                    <div style={room.base64coverImage ? { backgroundImage: `url(${room.base64coverImage})` } : {}}
                        key={room.owner + room.timestamp} className={room.base64coverImage ? classes.roomWithCoverImage : classes.room}>
                        <div className={classes.inner}>
                            {room.name}<div className={classes.icons}>
                                {user.id === room.owner && <AiOutlineEdit onClick={() => {
                                    mDispatch({ showModal: true, modalType: EModalType.RoomEditor })
                                    openRoomEditor(room.name)
                                }} />}
                                <BsDoorOpenFill onClick={async () => await createJoinRoom(room.name)} />
                                {user.id === room.owner && <MdDeleteForever style={{ background: "red" }} onClick={async () => await deleteRoom(room.name)} />}
                            </div>
                        </div>
                    </div>)}
            </div>
            <div className={formClasses.inputLabelWrapper}>
                {/*@ts-ignore-error*/}
                <form className={formClasses.inputAndButton} onSubmit={handleCreateJoinRoom}>
                    <input value={joinRoomNameInput} onChange={(e: ChangeEvent<HTMLInputElement>) => { e.preventDefault(); setJoinRoomNameInput(e.target.value) }} placeholder="Case sensitive..." type="text" required />
                    <button>Join/Create</button>
                </form>
            </div>
        </div>
    )
}