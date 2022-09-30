import { useEffect, useState } from "react"

import classes from "./ImageDescCards.module.scss"

import Image from "next/image"
import { BsChevronCompactLeft, BsChevronCompactRight } from "react-icons/bs"

export default function ImageDescCards({ html, images, imageHeight, alts, noHtml }: { html: string[], images: string[], imageHeight?: string, alts: string[], noHtml?: boolean }) {
    const [i, setI] = useState(0)

    const getHtml = () => ({ __html: html[i] })
    const imageStyle = (index: number) => index === i ? { filter: "opacity(1)", transform:"rotateX(0deg)" } : { filter: "opacity(0)",transform:"rotateX(90deg)" }

    return (
        <div className={classes.container}>
            <div style={imageHeight ? { height: imageHeight } : {}} className={classes.imageContainer}>
                {images.map((image, index) => <Image key={index} style={imageStyle(index)} alt={alts[index]} src={`${image}`} layout="fill" />)}
                <div className={classes.carouselIcons}>
                    <BsChevronCompactLeft onClick={() => setI(oldI => Math.max(oldI - 1, 0))} />
                    <BsChevronCompactRight onClick={() => setI(oldI => Math.min(oldI + 1, html.length - 1))} />
                </div>
            </div>
            {!noHtml && <div className={classes.htmlContainer}>
                <div className={classes.html} dangerouslySetInnerHTML={getHtml()} />
            </div>}
        </div>
    )
}