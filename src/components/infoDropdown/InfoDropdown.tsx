import { ReactNode, useEffect, useRef, useState } from "react"
import { BsChevronCompactDown } from "react-icons/bs"
import { MdClose } from "react-icons/md"
import classes from "./InfoDropdown.module.css"

export default function InfoDropdown({
    name,
    height = "4vh",
    children,
    noBottomBorder = false
}
    :
    {
        height?: string,
        name: string,
        children: ReactNode,
        noBottomBorder?: boolean
    }) {
    const [open, setOpen] = useState<boolean>(false)
    const [lastOpen, setLastOpen] = useState<boolean>(false)
    const [animating, setAnimating] = useState<boolean>(false)

    const [mouseIn, setMouseIn] = useState<boolean>(false)

    useEffect(() => {
        setAnimating(true)
        const to = setTimeout(() => setAnimating(false), 50)
        setLastOpen(open)
        return () => clearTimeout(to)
    }, [open])


    //doing it this way to avoid a null error/warning that occurs for some reason
    const getNoBottomBorderStyle = () => noBottomBorder ? { borderBottom: "none" } : {}

    const nodeRef = useRef<HTMLDivElement>(null)
    return (
        <>
            <div onClick={() => { if (!mouseIn) setOpen(!open) }} style={open || animating ? { zIndex: "100", height, ...getNoBottomBorderStyle() } : { height, ...getNoBottomBorderStyle() }}
                className={classes.container}>
                <div onMouseEnter={() => setMouseIn(true)} onMouseLeave={() => setMouseIn(false)} ref={nodeRef} style={{
                    bottom: `calc(${nodeRef.current ? nodeRef.current.clientHeight + -1 : -1}px * -1)`,
                    filter: lastOpen ? "opacity(1)" : "opacity(0)",
                    transform: lastOpen ? "scaleY(100%)" : "scaleY(0%)"
                }}
                    className={classes.nodeContainer}>
                    {children}
                    {open && <MdClose onClick={() => setOpen(false)} className={classes.closeIcon} />}
                </div>
                <div style={open ? { height: "100%" } : {}} className={classes.nameContainer}>
                    {name}
                </div>
                {!open && <div className={classes.openIconContainer}>
                    <BsChevronCompactDown />
                </div>}
            </div>
        </>
    )
}