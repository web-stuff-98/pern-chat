import type { CSSProperties } from "react"
import classes from "./ImageSelector.module.scss"

import { BsChevronLeft, BsChevronRight } from "react-icons/bs"

export default function ImageSelector({
    style = {},
    index = 0,
    setIndex = () => { },
    imgURLs = [
        "https://images.unsplash.com/photo-1659605199215-83f8b3a8b5a2?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=765&q=80",
        "https://images.unsplash.com/photo-1659563899808-9f94358bdf0e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1175&q=80",
        "https://images.unsplash.com/photo-1659563116744-cf82e9349d9a?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1075&q=80",
    ]
}: {
    style?: CSSProperties,
    index?: number,
    setIndex?: (to: number) => void,
    imgURLs?: string[]
}) {
    return (
        <div style={style} className={classes.container}>
            <BsChevronLeft onClick={() => setIndex(Math.max(index-1, 0))}/>
            <BsChevronRight onClick={() => setIndex(Math.min(index+1, imgURLs.length - 1))}/>
            <div style={{ backgroundImage: `url(${imgURLs[index]})` }} className={classes.imageContainer} />
        </div>
    )
}