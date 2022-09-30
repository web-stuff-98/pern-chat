import { useEffect } from "react"
import { useCallback } from "react"
import { useState } from "react"
import classes from "./TransitionImage.module.scss"

type Props = {
    imgURLs?: string[],
    width?: string,
    height?: string,
    transitionType?: EImageTransitionType,
    overrideImgIndex?: number,
    transitionOverride?: string,
    incrementInterval?: number,
    intervalOffset?: number,
}

export enum EImageTransitionType {
    "Blur",
    "Fade",
}

export default function TransitionImage({
    imgURLs = [
        './quadSquareImages/01.jpeg',
        './quadSquareImages/02.jpeg',
        './quadSquareImages/03.jpeg',
        './quadSquareImages/04.jpeg',
        './quadSquareImages/05.jpeg',
        './quadSquareImages/06.jpeg',
        './quadSquareImages/07.jpeg',
        './quadSquareImages/08.jpeg',
    ],
    width = "300px",
    height = "200px",
    transitionType = EImageTransitionType.Fade,
    overrideImgIndex = -1,
    transitionOverride = "600ms ease",
    incrementInterval = 3000,
    intervalOffset,
}: Props) {
    const [currentImageIndex, setCurrentImageIndex] = useState<number>(0)

    useEffect(() => {
        const incrementIndex = () => {
            if (intervalOffset)
                setTimeout(() => setCurrentImageIndex(oldIndex => (oldIndex === imgURLs.length - 1) ? 0 : oldIndex + 1), incrementInterval, intervalOffset)
            else
                setCurrentImageIndex(oldIndex => (oldIndex === imgURLs.length - 1) ? 0 : oldIndex + 1), incrementInterval
        }
        const i = setInterval(() => incrementIndex(), incrementInterval)
        return () => clearInterval(i)
    }, [])

    return (
        <div style={{ width, height }}
            className={classes.rootContainer}>
            {imgURLs.map((url, i) => (
                <img key={url.substring(0, 40)} style=
                    {{
                        [EImageTransitionType.Blur]: (overrideImgIndex !== -1 ? overrideImgIndex : currentImageIndex) === i ?
                            //Is visible
                            { filter: "blur(0) opacity(1)", transition: `filter ${transitionOverride}` }
                            :
                            //Isnt visible
                            { filter: "blur(12px) opacity(0)", transition: `filter ${transitionOverride}` },
                        [EImageTransitionType.Fade]: (overrideImgIndex !== -1 ? overrideImgIndex : currentImageIndex) === i ?
                            //Is visible
                            { filter: "opacity(1)", transition: `filter ${transitionOverride}` }
                            :
                            //Isnt visible
                            { filter: "opacity(0)", transition: `filter ${transitionOverride}` },
                    }[transitionType]}
                    src={url} />
            ))}
        </div>
    )
}