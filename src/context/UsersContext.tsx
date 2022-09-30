import axios from "axios"
import { find, has } from "lodash"
import type { ReactNode } from "react"
import { useEffect, useContext, createContext, useState, useCallback } from "react"
import IUser from "../interfaces/IUser"
import { useAuth } from "./AuthContext"

const UsersContext = createContext<
    {
        users: IUser[],
        setUsers: (to: IUser[]) => void,
        findUserData: (id: number) => IUser | undefined,
        cacheProfileDataForUser: (id: number, force?: boolean) => void,
        updateDataForUser: (id: number, data: Partial<IUser>) => void
    } | any
>(undefined)

export const UsersProvider = ({ children }: { children: ReactNode }) => {
    const [users, setUsers] = useState<IUser[]>([])

    const findUserData = useCallback((id: number) => find(users, (user: IUser) => (has(user, "id") ? user.id === id : false)), [users])

    const { user } = useAuth()
    useEffect(() => {
        if (user)
            cacheProfileDataForUser(user.id)
    }, [user])

    const cacheProfileDataForUser = async (id: number, force?: boolean) => {
        try {
            const found = find(users, (displayData: IUser) => displayData.id === id)
            if (found && !force) return found
            const res = await axios({
                method: "GET",
                url: `/api/user?id=${id}`,
                withCredentials: true,
                headers: { "Content-type": "application/json;charset=UTF-8" }
            })
            if (!res.data.accounts[0]) return
            if (force) {
                if (users.length > 0)
                    setUsers(data => [...data.filter((u) => u.id !== res.data.accounts[0].id), res.data.accounts[0]])
                else
                    setUsers([res.data.accounts[0]])
            }
            if (!found)
                setUsers(data => [...data, res.data.accounts[0]])
        } catch (e) {
            console.error(`Couldn't get user data for ${id}`)
        }
    }

    const updateDataForUser = (id: number, data: any) => {
        const i = users.findIndex((user: IUser) => user.id === id)
        if (i === -1) return
        setUsers(old => {
            //this is slow but i cant be asked to change it back again
            const newUser = { ...old[i], ...data }
            return [...old.filter((u: IUser) => u.id !== id)].concat([newUser])
        })
    }

    return (
        <UsersContext.Provider value={{ users, setUsers, updateDataForUser, findUserData, cacheProfileDataForUser }}>
            {children}
        </UsersContext.Provider>
    )
}

export const useUsers = () => useContext(UsersContext)