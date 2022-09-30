import Link from "next/link"
import { useRouter } from "next/router"
import { UIEvent, useRef } from "react"
import { CSSProperties, ReactNode, useEffect, useState } from "react"
import { useInterface } from "../../context/InterfaceContext"
import { useModal } from "../../context/ModalContext"
import { EModalType } from "../../enums/GeneralEnums"
import Info from "../modals/info/Info"

import classes from "./Layout.module.scss"


import { AiOutlineMenu } from "react-icons/ai"
import { SiPostgresql } from "react-icons/si"

import DarkToggle from "../darkToggle/DarkToggle"
import { useAuth } from "../../context/AuthContext"
import AttachmentViewer from "../modals/attachmentViewer/AttachmentViewer"
import RoomEditor from "../modals/roomEditor/RoomEditor"
import { useMouse } from "../../context/MouseContext"
import { useUserDropdown } from "../../context/UserDropdownContext"
import { useChat } from "../../context/ChatContext"
import Verify from "../modals/verify/Verify"
import { ChatSection } from "../../enums/ChatEnums"
import { BsChevronLeft, BsChevronRight } from "react-icons/bs"

export default function Layout({ children }: { children: ReactNode }) {
    const { state: iState, dispatch: iDispatch, isMobile, isTablet, autoAddRemoveSearchTag } = useInterface()
    const { state: mState, dispatch: mDispatch } = useModal()
    const { pathname, push, query } = useRouter()
    const { user } = useAuth()
    const { startConversation, setSection } = useChat()
    const { pos: userDropdownPos, open: userDropdownOpen, closeDropdown: closeUserDropdown, subjectUserId } = useUserDropdown()

    const mainRef = useRef<HTMLElement>(null)

    /////////////////////////////////////////
    const fitMainToContentStyle: CSSProperties = {
        width:"fit-content",
        height: "fit-content",
        maxWidth: "calc(100vw - var(--horizontal-whitespace) * 2.125 - var(--padding-base) * 4)",
        position: "relative", top: "0", left: "0",
        zIndex: "98",
        borderRadius: "3px",
        border: iState.darkMode ? "1px solid var(--base-pale)" : "1px solid var(--base)",
        overflow: "visible",
        boxShadow: "0px 2px 2px rgba(0,0,0,0.25)",
        margin: "auto"
    }

    const fullWidthStyle: CSSProperties = {
        width: "100%", left: "0", padding: "0"
    }

    const noBackgroundStyle: CSSProperties = {
        background: "none",
        boxShadow: "none",
        border: "none"
    }

    const scrollStyle: CSSProperties = {
        overflowY: "auto"
    }
    /////////////////////////////////////////

    const [showModalFade, setShowModalFade] = useState(false)
    useEffect(() => setShowModalFade(mState.showModal ? true : false), [mState.showModal])

    const renderNavLink = (path: string, name: string) =>
        <Link href={`/${path.toLowerCase()}`}>
            <div style={pathname === `/${path}` ? {
                filter: "opacity(0.5)",
                pointerEvents: "none"
            } : {}} className={classes.link}>
                {name}
                <span />
            </div>
        </Link >

    const handleScroll = (e: UIEvent<HTMLElement>) => {
        iDispatch({
            scrollTop: e.currentTarget.scrollTop,
            scrollPercent: e.currentTarget.scrollTop / (e.currentTarget.scrollHeight - e.currentTarget.clientHeight) * 100
        })
    }

    const prevPage = () => {
        const { term, tags } = query
        const preserveQuery = `${term ? `?term=${term}` : ""}${tags ? `${term ? "&" : "?"}tags=${tags}` : ""}`
        push(`/blog/page/${Math.max(Number(query.page) - 1, 1)}${preserveQuery}`)
    }
    const nextPage = () => {
        const { term, tags } = query
        const preserveQuery = `${term ? `?term=${term}` : ""}${tags ? `${term ? "&" : "?"}tags=${tags}` : ""}`
        push(`/blog/page/${Math.min(Number(query.page) + 1, iState.max_page)}${preserveQuery}`)
    }

    const mousePos = useMouse()

    return (
        <div style={iState.layoutStyle.fitMainToContent ? { paddingTop: "var(--header-height)" } : {}} className={classes.container}>
            <div className={classes.backgroundOuterContainer}>
                <div className={classes.backgroundInnerContainer}>
                    <div style={{
                        backgroundPositionY: `${iState.scrollTop * -0.05}px`,
                    }} aria-label="hidden" className={classes.background} />
                    <div aria-label="hidden"
                        style={{
                            ...((isMobile() || isTablet()) ? {
                                maskImage: `radial-gradient(circle at 50% 50%, transparent -50%, rgba(0,0,0,0.25) 86.66%)`,
                                WebkitMaskImage: `radial-gradient(circle at 50% 50%, transparent -50%, rgba(0,0,0,0.25) 86.66%)`,
                            } : {
                                maskImage: `radial-gradient(circle at ${(mousePos?.left! / iState.winDimensions.width) * 100}% ${(mousePos?.top! / iState.winDimensions.height) * 100}%, black 0%, transparent 7%)`,
                                WebkitMaskImage: `radial-gradient(circle at ${(mousePos?.left! / iState.winDimensions.width) * 100}% ${(mousePos?.top! / iState.winDimensions.height) * 100}%, black 0%, transparent 7%)`,
                            }),
                            ...(iState.darkMode ? { filter: "brightness(5.5) contrast(1.5) blur(3px)" } : {}),
                            backgroundPositionY: `${iState.scrollTop * -0.05}px`,
                        }}
                        className={classes.backgroundHover} />
                </div>
            </div>
            <header>
                {user && <div className={classes.email}>{user.email}</div>}
            </header>
            <nav style={{
                ...(iState.darkMode ? {
                    borderBottom: "1px solid var(--base-pale)"
                } : {}), ...(iState.mobileNavOpen ? {
                    height: "15pc"
                } : {})
            }}
                className={isMobile() ? classes.mobileNav : classes.nav}>
                <DarkToggle />
                {isMobile() ?
                    <>
                        {iState.mobileNavOpen &&
                            <div className={classes.links}>
                                {user ?
                                    <>
                                        <Link href={"/chat"}>
                                            Chat
                                        </Link>
                                        <Link href={"/settings"}>
                                            Settings
                                        </Link>
                                        <Link href={"/editor"}>
                                            Editor
                                        </Link>
                                    </>
                                    :
                                    <>
                                        <Link href="/login">
                                            Login
                                        </Link>
                                        <Link href="/register">
                                            Register
                                        </Link>
                                    </>}
                                <Link href={"/"}>
                                    About
                                </Link>
                                <Link href={"/blog/page/1"}>
                                    Blog
                                </Link>
                                <Link href={"/policy"}>
                                    Policy
                                </Link>
                            </div>}
                        <AiOutlineMenu onClick={() => {
                            iDispatch({ mobileNavOpen: !iState.mobileNavOpen })
                        }} className={classes.mobileMenuIcon} />
                    </>
                    :
                    <>
                        <div className={classes.logo}>
                            Pern-Chat
                        </div>
                        <div className={classes.navLinks}>
                            {user ?
                                <>
                                    {renderNavLink("chat", "Chat")}
                                    {renderNavLink("settings", "Settings")}
                                    {renderNavLink("policy", "Policy")}
                                    {renderNavLink("editor", "Editor")}
                                </>
                                :
                                <>
                                    {renderNavLink("login", "Login")}
                                    {renderNavLink("register", "Register")}
                                    {renderNavLink("policy", "Policy")}
                                </>}
                            {renderNavLink("", "About")}
                            {renderNavLink("blog/page/1", "Blog")}
                        </div>
                    </>}
            </nav>
            <main ref={mainRef} onScroll={handleScroll} style={{
                ...(iState.layoutStyle.fitMainToContent ? fitMainToContentStyle : {}),
                ...(iState.layoutStyle.fullWidth ? fullWidthStyle : {}),
                ...(iState.layoutStyle.noBackground ? noBackgroundStyle : {}),
                ...(iState.layoutStyle.scroll ? scrollStyle : {}),
                ...(iState.darkMode ? { borderLeft: "1px solid var(--base-pale)", borderRight: "1px solid var(--base-pale)" } : {}),
            }}>
                {iState.search_tags.length > 0 && <div className={classes.searchTagsContainer}>
                    {iState.search_tags.map((tag: string) => <div key={tag} onClick={() => { autoAddRemoveSearchTag(tag) }}
                        className={true ? classes.tag : classes.tagHidden}>
                        {tag}
                    </div>)}
                </div>}
                {children}
            </main>
            {!iState.layoutStyle.noFooter && <footer style={(isMobile() || isTablet()) ? { borderTop: "1px solid var(--base-pale)" } : {}}>
                <BsChevronLeft onClick={() => prevPage()} />
                {<div className={classes.pageAndCount}>
                    <div className={classes.page}>{query.page}/{Math.ceil(iState.full_count / 20)}</div>
                    <div className={classes.count}>{iState.page_count}/{iState.full_count}</div>
                </div>}
                <BsChevronRight onClick={() => nextPage()} />
            </footer>}
            {/*--------------- MODAL ---------------*/}
            {mState.showModal &&
                <div style={showModalFade ? {
                    filter: "opacity(1)"
                } : { filter: "opacity(0)" }} className={classes.modalOuterContainer}>
                    <div aria-label="hidden" onClick={() => mDispatch({ showModal: false })} className={classes.modalBackdrop} />
                    <div className={classes.modalInnerContainer}>
                        <div className={classes.modalContainer}>
                            <>{{
                                [EModalType.Info]: <Info />,
                                [EModalType.AttachmentViewer]: <AttachmentViewer />,
                                [EModalType.RoomEditor]: <RoomEditor />,
                                [EModalType.Verify]: <Verify />,
                            }[mState.modalType]}
                            </>
                        </div>
                    </div>
                </div>}
            {/*--------------- USER DROPDOWN MODAL ---------------*/}
            {userDropdownOpen &&
                <div className={classes.modalOuterContainer}>
                    <div aria-label="hidden" onClick={() => closeUserDropdown()} className={classes.modalBackdrop} />
                    <div className={classes.modalInnerContainer}>
                        <div style={{
                            left: `${userDropdownPos.left}px`, top: `${userDropdownPos.top}px`
                        }} className={classes.userDropdownModal}>
                            <button onClick={() => { startConversation(subjectUserId); closeUserDropdown(); push("/chat"); setSection(ChatSection.CONVERSATION) }}>Direct message</button>
                        </div>
                    </div>
                </div>}
        </div>
    )
}