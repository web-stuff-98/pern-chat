import { useState, createContext, useContext, useEffect } from "react"
import type { ReactNode } from "react"
import IUser from "../interfaces/IUser"
import axios from "axios"

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<IUser | undefined>()
    const [initializing, setInitializing] = useState(true)

    const checkLoggedIn = async () => {
        try {
            const axres = await axios({
                method: "GET",
                url: "/api/checklogin",
                headers: { "Content-type": "application/json;" },
                withCredentials: true,
            })
            let set = axres.data
            if (!axres.data)
                setUser(undefined)
            else {
                delete set.message
                setUser(Object.keys(set).length === 0 ? undefined : set)
            }
        } catch (e) {
            setUser(undefined)
        } finally {
            setInitializing(false)
        }
    }

    useEffect(() => {
        checkLoggedIn()
        const checkLoginInterval = setInterval(() => {
            checkLoggedIn()
        }, 3000)
        return () => clearInterval(checkLoginInterval)
    }, [])

    return (
        <AuthContext.Provider value={{ user, setUser, initializing }}>
            {children}
        </AuthContext.Provider>
    )
}

const AuthContext = createContext<
    {
        user: IUser,
        setUser: (to: IUser) => void
    } | any
>(undefined)

export const useAuth = () => useContext(AuthContext)