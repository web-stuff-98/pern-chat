import { WiMoonAltThirdQuarter } from "react-icons/wi"
import { useInterface } from "../../context/InterfaceContext"

import classes from "./DarkToggle.module.scss"

export default function DarkToggle() {
    const { state: iState, dispatch: iDispatch, isMobile } = useInterface()

    return (
        <div style={isMobile() ? { color: "white" } : {}} onClick={() => {
            iDispatch({ darkMode: !iState.darkMode })
        }} className={classes.container}>
            <WiMoonAltThirdQuarter style={isMobile() ? { fill: "white" } : {}} />
            {iState.darkMode ? "Dark mode" : "Light mode"}
        </div>
    )
}