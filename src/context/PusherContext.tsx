import { useContext, createContext } from "react"
import type { ReactNode } from "react"
import Pusher from "pusher-js"

const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER,
    channelAuthorization: {
        endpoint: "/api/pusher/auth",
        transport:"ajax",
    },
})

const PusherContext = createContext<
    {
        pusher: Pusher,
    } | any
>(undefined)

export default function PusherProvider({ children }: { children: ReactNode }) {
    return (
        <PusherContext.Provider value={{ pusher }}>
            {children}
        </PusherContext.Provider>
    )
}

export const usePusher = () => useContext(PusherContext)