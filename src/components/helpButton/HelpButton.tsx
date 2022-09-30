import classes from "./HelpButton.module.scss"

import { BiHelpCircle } from "react-icons/bi"
import { useModal } from "../../context/ModalContext"
import { useInfo } from "../../context/InfoContext"
import { EModalType } from "../../enums/GeneralEnums"

import Tilt from "react-parallax-tilt"

type Props = {
    text: string
}

export default function HelpButton({
    text = "Help stuff"
}: Props) {
    const { dispatch: mDispatch } = useModal()
    const { setHtml } = useInfo()

    const clicked = () => {
        setHtml(text)
        mDispatch({ showModal: true, modalType: EModalType.Info })
    }

    return (
        <div onClick={() => clicked()} className={classes.container}>
            <Tilt perspective={50}>
                <BiHelpCircle className={classes.icon} />
            </Tilt>
        </div>
    )
}