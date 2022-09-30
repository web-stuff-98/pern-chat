import { useReducer, createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { ChatSection } from "../enums/ChatEnums"
import { IResponseMessage } from "../interfaces/GeneralInterfaces"
import { usePusher } from "./PusherContext"
import { ChatRoom, Message } from "../pages/chat"
import axios, { AxiosError } from "axios"
import { useUsers } from "./UsersContext"

import has from "lodash/has"
import { useAuth } from "./AuthContext"

/**
 * This file is probably too large. Was getting array state bugs with useReducer
 * so I had to put some state into useState to stop the weird behaviour
 */

const initialState = {
    section: { currentSection: ChatSection.MENU, lastSection: ChatSection.MENU },
    resMsg: { message: "", error: false, pending: false },
    room: { id: 0, name: "", joined: false, messages: [], owner: 0, timestamp: 0 },
    editingRoom: { isEditing: false, roomName: "" },
    conversee: -1,
    attachmentProgress: 0
}

type EditingRoom = {
    isEditing: Boolean,
    roomName: string
}

type State = {
    section: SectionState,
    resMsg: IResponseMessage,
    room: CurrentRoom,
    editingRoom: EditingRoom,
    conversee: number,
    attachmentProgress: number
}

type Action = Partial<State>
type Dispatch = (action: Action) => void

const ChatContext = createContext<
    {
        state: State,
        dispatch: Dispatch,
        roomMessages: Message[]
        rooms: ChatRoom[],
        setSection: (to: ChatSection) => void,
        createJoinRoom: (name: string) => void,
        deleteRoom: (name: string) => void,
        openRoomEditor: (roomName: string) => void,
        startConversation: (id: number) => void,
        getConvs: () => void,
        getConv: () => void,
        conversations: number[],
        inboxMessages: Message[],
        addConvMessage: (msg: string, hasFile: boolean, fileType: string) => void
    }
>({
    state: initialState,
    dispatch: () => { },
    roomMessages: [],
    rooms: [],
    setSection: () => { },
    createJoinRoom: () => { },
    deleteRoom: () => { },
    openRoomEditor: () => { },
    startConversation: () => { },
    getConvs: () => { },
    getConv: () => { },
    conversations: [],
    inboxMessages: [],
    addConvMessage: () => { },
})

export type SectionState = {
    currentSection: ChatSection,
    lastSection: ChatSection
}

export type CurrentRoom = {
    id: number
    name: string
    joined: boolean
    messages: Message[]
    timestamp: number
    owner: number
    base64coverImage?: string
}

const chatReducer = (state: State, action: Partial<State>) => ({ ...state, ...action })

export default function ChatProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(chatReducer, initialState)

    const { pusher } = usePusher()
    const { cacheProfileDataForUser, updateDataForUser } = useUsers()
    const { user } = useAuth()

    //////////////// CHAT ROOM & ROOM EDITOR STUFF
    const [rooms, setRooms] = useState<ChatRoom[]>([])
    const openRoomEditor = (roomName: string) => dispatch({
        editingRoom: { isEditing: false, roomName }
    })

    const createJoinRoom = async (roomName: string) => {
        try {
            dispatch({ resMsg: { message: "", error: false, pending: true } })
            setSection(ChatSection.ROOM)
            const axres = await axios({
                method: "POST",
                url: "/api/room",
                data: { roomName },
                withCredentials: true,
            })
            const { id, name, messages: rawMessages, timestamp, owner, base64coverImage } = axres.data.room
            const messages = rawMessages.map((msg: any) => ({
                message: msg.message,
                timestamp: Number(msg.timestamp),
                author: Number(msg.author),
                id: msg.id,
                ...(msg.hasAttachment ? {
                    hasAttachment: true,
                    attachmentPending: Boolean(msg.attachmentPending),
                    attachmentMimeType: msg.attachmentMimeType,
                } : {})
            }))
            if (!axres.data.created) {
                let uids: number[] = []
                messages.forEach((message: Message) => { if (!uids.includes(message.author)) uids.push(message.author) })
                uids.forEach((uid: number) => cacheProfileDataForUser(uid, true))
                dispatch({ room: { id, name, joined: true, timestamp, owner, messages: roomMessages, ...(base64coverImage ? { base64coverImage } : {}) } });
                setSection(ChatSection.ROOM)
                setRoomMessages(messages)
            }
            dispatch({ resMsg: { message: axres.data.message, error: false, pending: false } })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? dispatch({ resMsg: { message: e.response.data.message, error: true, pending: false } }) : dispatch({ resMsg: { message: `${e}`, pending: false, error: true } }))
                    : dispatch({ resMsg: { message: `${e}`, pending: false, error: true } })
            }
        }
    }
    const deleteRoom = async (roomName: string) => {
        try {
            await axios({
                method: "DELETE",
                url: "/api/room",
                data: { roomName },
                withCredentials: true
            })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? dispatch({ resMsg: { message: e.response.data.message, error: true, pending: false } }) : dispatch({ resMsg: { message: `${e}`, pending: false, error: true } }))
                    : dispatch({ resMsg: { message: `${e}`, pending: false, error: true } })
            }
        }
    }
    const getRooms = async () => {
        try {
            const axres = await axios({
                method: "GET",
                url: "/api/room?all=true",
                withCredentials: true,
            })
            setRooms(axres.data.rooms)
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? dispatch({ resMsg: { message: e.response.data.message, error: true, pending: false } }) : dispatch({ resMsg: { message: `${e}`, pending: false, error: true } }))
                    : dispatch({ resMsg: { message: `${e}`, pending: false, error: true } })
            }
        }
    }
    const [roomMessages, setRoomMessages] = useState<Message[]>([])

    //////////////// CONVERSATIONS & MESSAGING FUNCTIONS
    const [conversations, setConversations] = useState<number[]>([])
    const [inboxMessages, setInboxMessages] = useState<Message[]>([])
    const getConvs = async () => {
        try {
            const axres = await axios({
                method: "GET",
                url: "/api/conv?all=true",
                withCredentials: true,
            })
            const convs = axres.data.conversations
            convs.forEach((uid: number) => cacheProfileDataForUser(uid, true))
            setConversations(axres.data.conversations)
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? dispatch({ resMsg: { message: e.response.data.message, error: true, pending: false } }) : dispatch({ resMsg: { message: `${e}`, pending: false, error: true } }))
                    : dispatch({ resMsg: { message: `${e}`, pending: false, error: true } })
            }
        }
    }
    const addConvMessage = (message: string, hasFile: boolean, fileType: string) => {
        setInboxMessages(old => [...old, {
            message,
            author: user.id,
            id: "",
            timestamp: Date.now(),
            ...(hasFile ? {
                hasAttachment: true,
                attachmentPending: false,
                attachmentMimeType: fileType
            } : {})
        }])
    }
    const getConv = async () => {
        try {
            const axres = await axios({
                method: "GET",
                url: `/api/conv?userId=${state.conversee}`,
                withCredentials: true,
            })
            const msgs = axres.data.messages
            if (!msgs) return
            let uids: number[] = []
            msgs.forEach((msg: any) => {
                if (!uids.includes(msg.author))
                    uids.push(msg.author)
            })
            uids.forEach((uid: number) => cacheProfileDataForUser(uid, true))
            setInboxMessages(msgs.map((msg: any) => ({
                message: msg.message,
                timestamp: Number(msg.timestamp),
                author: Number(msg.author),
                id: msg.id,
                ...(msg.hasAttachment ? {
                    hasAttachment: true,
                    attachmentPending: Boolean(msg.attachmentPending),
                    attachmentMimeType: msg.attachmentMimeType
                } : {})
            })))
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? dispatch({ resMsg: { message: e.response.data.message, error: true, pending: false } }) : dispatch({ resMsg: { message: `${e}`, pending: false, error: true } }))
                    : dispatch({ resMsg: { message: `${e}`, pending: false, error: true } })
            }
        }
    }
    const startConversation = async (userId: number) => {
        try {
            await axios({
                method: "POST",
                url: `/api/conv?userId=${userId}`,
                withCredentials: true,
            })
            setConversations(old => [...old, userId])
            setSection(ChatSection.CONVERSATION)
            dispatch({ conversee: userId })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? dispatch({ resMsg: { message: e.response.data.message, error: true, pending: false } }) : dispatch({ resMsg: { message: `${e}`, pending: false, error: true } }))
                    : dispatch({ resMsg: { message: `${e}`, pending: false, error: true } })
            }
        }
    }

    //////////////// PUSHER SUBSCRIPTIONS
    useEffect(() => {
        if (!pusher) return
        let rc // rc = room channel
        if (state.room.joined) {
            rc = pusher.subscribe(`room=${state.room.id}`)
            rc.bind("room-message-added", (data: Message) => {
                cacheProfileDataForUser(data.author)
                setRoomMessages(old => [...old, data])
            })
            rc.bind("room-message-deleted", (data: any) => {
                setRoomMessages(old => old.filter((msg: Message) => msg.id !== data.msgId))
            })
            rc.bind("room-message-updated", (data: any) => {
                setRoomMessages((old: Message[]) => {
                    const i = old.findIndex((msg: any) => msg.id === data.msgId)
                    if (i === -1) return old
                    let out = old; out[i].message = data.message
                    return out
                })
            })
            rc.bind('room-cover-image-updated', (data: any) => {
                dispatch({ room: { ...state.room, base64coverImage: data.base64 } })
            })
            rc.bind("attachment-uploaded", (data: any) => {
                setRoomMessages((old: Message[]) => {
                    const i = old.findIndex((msg: any) => msg.id === data.msgId)
                    if (i === -1) return old
                    let out = old; out[i] = {
                        ...old[i],
                        hasAttachment: true,
                        attachmentPending: false,
                        attachmentMimeType: data.mimeType
                    }
                    return out
                })
            })
            rc.bind("pfp-updated", (data: any) => {
                updateDataForUser(data.id, data)
            })
        } else {
            pusher.unsubscribe(`room=${state.room.id}`)
        }
    }, [pusher, state.room])
    useEffect(() => {
        if (!user || !pusher) return
        // ic = inbox channel
        const ic = pusher.subscribe(`private-inbox=${user.id}`)
        ic.bind("message-added", (data: Message) => {
            cacheProfileDataForUser(data.author)
            setInboxMessages(old => [...old, data])
        })
        ic.bind("attachment-uploaded", (data: any) => {
            setInboxMessages((old: Message[]) => {
                const i = old.findIndex((msg: any) => msg.id === data.msgId)
                if (i === -1) return old
                let out = old;
                out[i] = {
                    ...old[i],
                    hasAttachment: true,
                    attachmentPending: false,
                    attachmentMimeType: data.mimeType
                }
                return out
            })
        })
        ic.bind("message-deleted", (data: any) => {
            setInboxMessages(old => old.filter((msg: Message) => msg.id !== data.msgId))
        })
        ic.bind("pfp-updated", (data: any) => {
            updateDataForUser(data.id, data)
        })
    }, [pusher, user])
    useEffect(() => {
        if (!pusher) return
        let rsc // rsc = rooms channel (with an s)
        if (state.section.currentSection === ChatSection.ROOM_LIST) {
            rsc = pusher.subscribe('rooms')
            getRooms()
            rsc.bind('room-added', (data: ChatRoom) => {
                cacheProfileDataForUser(data.owner)
                //@ts-ignore-error CBA with this
                setRooms((old: ChatRoom[]) => [...old, data])
            })
            rsc.bind('room-cover-image-updated', (data: any) => {
                //@ts-ignore-error CBA with this
                setRooms((old: ChatRoom[]) => {
                    let out = old
                    let i = old.findIndex((room: ChatRoom) => room.name === data.name)
                    out[i] = { ...out[i], base64coverImage: data.base64 }
                    return out
                })
                if (data.name === state.room.name) {
                    dispatch({ room: { ...state.room, base64coverImage: data.base64 } })
                }
            })
            rsc.bind('room-deleted', (data: any) => {
                if (data.roomName === state.room.name) {
                    setSection(ChatSection.MENU)
                    dispatch({ room: { id: -1, name: "", messages: [], owner: -1, timestamp: 0, joined: false } })
                }
                setRooms((old: ChatRoom[]) => [...old.filter((room: ChatRoom) => room.name !== data.roomName)])
            })
        } else {
            pusher.unsubscribe('rooms')
        }
    }, [pusher, state.section])

    const setSection = (to: ChatSection) => {
        dispatch({
            resMsg: { message: "", error: false, pending: false },
            section: { currentSection: to, lastSection: state.section.currentSection },
        })
        if (to === ChatSection.ROOM_LIST) pusher.subscribe('rooms')
        else pusher.unsubscribe('rooms')
    }

    return (
        <ChatContext.Provider value={{
            setSection,
            state,
            dispatch,
            createJoinRoom,
            deleteRoom,
            roomMessages,
            rooms,
            openRoomEditor,
            startConversation,
            getConvs,
            getConv,
            conversations,
            addConvMessage,
            inboxMessages
        }}>
            {children}
        </ChatContext.Provider>
    )
}

export const useChat = () => useContext(ChatContext)