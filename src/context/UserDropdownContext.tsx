import { createContext, useState, useContext } from "react"
import type { ReactNode } from "react"
import { IPosition } from "../interfaces/GeneralInterfaces"
import { useMouse } from "./MouseContext"

export default function UserDropdownProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState<IPosition>({ left: 0, top: 0 })
    const [subjectUserId, setSubjectUserId] = useState(-1)

    const mousePos = useMouse()

    const openUserDropdown = (userId: number) => {
        setOpen(true)
        //@ts-ignore-error
        setPos(mousePos)
        setSubjectUserId(userId)
    }
    const closeDropdown = () => setOpen(false)

    return (
        <UserDropdownContext.Provider value={{ open, pos, subjectUserId, openUserDropdown, closeDropdown }}>
            {children}
        </UserDropdownContext.Provider>
    )
}

const UserDropdownContext = createContext<
    {
        open: boolean,
        pos: IPosition,
        subjectUserId: number,
        openUserDropdown: () => void,
        closeDropdown: () => void
    } | any
>(undefined)

export const useUserDropdown = () => useContext(UserDropdownContext)