import { useAuth } from "../src/context/AuthContext";
import { useRouter } from "next/router";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: JSX.Element }) {
    const { user, initializing } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!initializing)
            if (!user)
                router.push("/login")
    }, [initializing, router, user])

    if (initializing) {
        return <h1 style={{ padding: "1pc" }}>401</h1>
    } else {
        if (user) {
            return <>{children}</>
        } else {
            return <h1 style={{ padding: "1pc" }}>401</h1>
        }
    }
}