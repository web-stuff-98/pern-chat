import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"

const InfoContext = createContext<
    {
        html: string,
        setHtml: (html: string) => void
    }
>({ html: "<h1>Hello</h1>", setHtml: (to: string) => { } })

export const InfoProvider = ({ children }: { children: ReactNode }) => {
    const [html, setHtmlState] = useState<string>("<h1>Hello</h1>")
    const setHtml = (to: string) => setHtmlState(to)
    return (
        <InfoContext.Provider value={{ html, setHtml }}>
            {children}
        </InfoContext.Provider>
    )
}
export const useInfo = () => useContext(InfoContext)