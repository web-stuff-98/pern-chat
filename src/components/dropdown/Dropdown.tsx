import { useEffect, useRef, useState } from "react"
import { useDropdown } from "../../context/DropdownContext"
import classes from "./Dropdown.module.scss"

/**
 * put in an empty object for containerStyle if you want to use this with grid, default style is width and height at 100%
 */

export default function Dropdown({
    containerStyle = { width: "100%", height: "var(--input-height)" },
    items = ["Example item 1", "Example item 2", "Example item 3"],
    selectedIndex = 0,
    setIndex = () => { }
}: {
    containerStyle?: object,
    items?: string[],
    selectedIndex?: number,
    setIndex: (to: number) => void,
}) {
    const { state: dState, dispatch: dDispatch } = useDropdown()

    const [dropdownOpen, setDropdownOpen] = useState(false)

    const getItemTopOffset = (i: number) => `${containerRef.current?.clientHeight! * i}px`
    const getItemBorderStyle = (i: number) => {
        if ((i !== items.length - 1) && i !== 0) {
            return { borderBottom: "none", borderRadius: "3px" }
        } else if (i === 0) {
            return { borderBottom: "none", borderBottomLeftRadius: "3px", borderBottomRightRadius: "3px" }
        } else if (i === items.length - 1) {
            return { borderTopLeftRadius: "3px", borderTopRightRadius: "3px" }
        }
    }

    useEffect(() => {
        if (dState.closeAllDropdowns) setDropdownOpen(false)
    }, [dState.closeAllDropdowns])

    const getContainerZIndex = () => dropdownOpen ? { zIndex: "100" } : {}

    const containerRef = useRef<HTMLDivElement>(null)
    return (
        <>
            {dropdownOpen && <div className={classes.backdrop}
                onClick={() => {
                    dDispatch({ closeAllDropdowns: true, dropdownOpen: false })
                }}
            />}
            <div onClick={() => {
                if (!dropdownOpen) {
                    setDropdownOpen(true)
                    dDispatch({ dropdownOpen: true })
                }
            }} ref={containerRef}
                style={{ ...containerStyle, ...getContainerZIndex() }} className={classes.container}>
                {dropdownOpen ?
                    <>
                        {items.map((item, i) =>
                            <div key={item} style={{
                                top: getItemTopOffset(i),
                                ...getItemBorderStyle(i),
                                zIndex: "100"
                            }} className={classes.item}
                                onClick={() => {
                                    setIndex(i)
                                    dDispatch({ closeAllDropdowns: true })
                                }}
                            >
                                {item}
                            </div>
                        )}
                    </>
                    :
                    <div className={classes.item}>
                        {items[selectedIndex]}
                    </div>
                }
            </div>
        </>
    )
}