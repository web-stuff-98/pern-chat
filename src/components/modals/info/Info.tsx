import { useInfo } from "../../../context/InfoContext"

import modalClasses from "../ModalShared.module.scss"
import classes from "./Info.module.scss"

export default function Info() {
    const { html: __html } = useInfo()
    return (
        <div className={modalClasses.container}>
            <div className={classes.container} dangerouslySetInnerHTML={{ __html }} />
        </div>
    )
}