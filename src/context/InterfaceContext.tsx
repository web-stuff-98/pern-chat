import type { ReactNode } from "react"
import { useCallback, createContext, useContext, useEffect, useReducer } from "react"

import { IDimensions } from "../interfaces/GeneralInterfaces"
import { ELayoutType } from "../enums/GeneralEnums"

import { useRouter } from "next/router"

interface ILayoutStyle {
    noBackground: boolean,
    fullWidth: boolean,
    fitMainToContent: boolean,
    scroll: boolean,
    noFooter: boolean
}

const initialState = {
    layoutType: ELayoutType.Desktop,
    winDimensions: { width: 0, height: 0 },
    scrollTop: 0,
    scrollPercent: 0,
    layoutStyle: {
        noBackground: false,
        fullWidth: false,
        fitMainToContent: false,
        scroll: false,
        noFooter: false,
    },
    iExist: false,
    mobileNavOpen: false,
    darkMode: true,
    full_count: 0,
    page_count: 0,
    search_tags: [],
    max_page: 1
}

type State = {
    layoutType: ELayoutType,
    layoutStyle: ILayoutStyle,
    scrollTop: number,
    scrollPercent: number,
    winDimensions: IDimensions,
    iExist: boolean,
    mobileNavOpen: boolean,
    darkMode: boolean,
    full_count: number,
    page_count: number,
    search_tags: string[],
    max_page: number
}
type Action = Partial<State>
type Dispatch = (action: Action) => void

const InterfaceContext = createContext<
    {
        state: State, dispatch: Dispatch,
        isMobile: () => boolean,
        isTablet: () => boolean,
        autoAddRemoveSearchTag: (tag: string) => void
    }
>({
    state: initialState, dispatch: () => { },
    isMobile: () => false,
    isTablet: () => false,
    autoAddRemoveSearchTag: () => { }
})

const interfaceReducer = (state: State, action: Action) => {
    return { ...state, ...action }
}

export const InterfaceProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(interfaceReducer, initialState)

    const isMobile = useCallback(() => state.layoutType === ELayoutType.Mobile, [state.layoutType])
    const isTablet = useCallback(() => state.layoutType === ELayoutType.Tablet, [state.layoutType])

    const adjust = () => {
        let layoutType = ELayoutType.Desktop
        let ratio = window.innerWidth / window.innerHeight
        if (window.innerHeight > 1300 || window.innerWidth > 3000)
            layoutType = ELayoutType.Widescreen
        if (ratio < 1.625 || window.innerHeight < 930)
            layoutType = ELayoutType.NarrowDesktop
        if (ratio < 1.33 || window.innerHeight < 750)
            layoutType = ELayoutType.Tablet
        if (ratio < 1)
            layoutType = ELayoutType.Mobile
        const rootStyle = document.documentElement.style
        ratio = ratio * ((Math.max(300, Math.min(window.innerHeight, 800)) - 300) / 500)
        rootStyle.setProperty('--horizontal-whitespace', `calc(${33.33 * Math.pow(Math.min(Math.max(ratio - 1, 0), 1), 1.5)}vw)`)
        rootStyle.setProperty('--blog-height-division', layoutType === ELayoutType.Mobile ? "2" : "3")
        dispatch({
            layoutType,
            winDimensions: { width: window.innerWidth, height: window.innerHeight },
            ...(layoutType !== ELayoutType.Mobile ? { mobileNavOpen: false } : {})
        })
    }

    useEffect(() => {
        if (typeof state.darkMode === "undefined") return
        if (state.darkMode)
            document.body.classList.add('darkMode')
        else
            document.body.classList.remove('darkMode')
    }, [state.darkMode])

    useEffect(() => {
        window.addEventListener('resize', adjust)
        window.addEventListener('blur', adjust)
        adjust()
        dispatch({ iExist: true })
        const i = setInterval(adjust, 100)
        return () => {
            clearInterval(i)
            window.removeEventListener('resize', adjust)
            window.removeEventListener('blur', adjust)
        }
    }, [])

    useEffect(() => {
        document.documentElement.style.setProperty('--footer-height', state.layoutStyle.noFooter ? "0pc" : (isMobile() || isTablet()) ? "3pc" : "6.66vh")
    }, [state.layoutStyle.noFooter, state.layoutType])
    useEffect(() => {
        document.documentElement.style.setProperty('--header-height', isMobile() ? "2vh" : "10vh")
    }, [state.layoutType])

    const { pathname, push, query } = useRouter()
    const autoAddRemoveSearchTag = (tag: string) => {
        const { tags: rawTags } = query
        let tags: string[] = []
        if (rawTags)
            tags = String(rawTags).replaceAll(" ", "+").split("+").filter((tag: string) => tag !== "")
        if (tags.includes(tag)) {
            tags = tags.filter((t: string) => t !== tag)
        } else {
            tags = [...tags, tag]
        }
        dispatch({ search_tags: tags })
        push(`/blog/page/1${tags.length > 0 ? (`?tags=` + tags.join("+")) : ""}`)
    }
    useEffect(() => {
        if (!pathname) return
        if (pathname === "/about" || pathname.includes("/blog")) dispatch({
            layoutStyle: {
                noBackground: false,
                fullWidth: false,
                fitMainToContent: false,
                scroll: pathname.includes("/blog/page"),
                noFooter: !pathname.includes("/blog/page"),
            },
        })
        if (pathname === "/editor") dispatch({
            layoutStyle: {
                noBackground: false,
                fullWidth: false,
                fitMainToContent: false,
                scroll: true,
                noFooter: true,
            },
        })
        if (pathname === "/login" || pathname === "/" || pathname === "/register" || pathname === "/chat" || pathname === "/settings" || pathname === "/policy") dispatch({
            layoutStyle: {
                noBackground: false,
                fullWidth: false,
                fitMainToContent: true,
                scroll: false,
                noFooter: true,
            },
        })
    }, [pathname])


    return (
        <InterfaceContext.Provider value={{ state, dispatch, isMobile, isTablet, autoAddRemoveSearchTag }}>
            {children}
        </InterfaceContext.Provider>
    )
}

export const useInterface = () => useContext(InterfaceContext)