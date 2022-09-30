import useAttachmentViewer from "../../../context/AttachmentViewerContext"

import modalClasses from "../ModalShared.module.scss"
import classes from "./AttachmentViewer.module.scss"

import Image from "next/image"

function AttachmentViewer() {
    const { attachedFileInfo } = useAttachmentViewer()

    return (
        <div className={modalClasses.container}>
            <div className={classes.container}>
                <h1>Viewing attached file</h1>
                {attachedFileInfo.mimeType.includes("image/") ?
                    <div className={classes.imgContainer}>
                        <Image objectPosition="center" objectFit="contain" layout="fill" src={`https://res.cloudinary.com/dzpzb3uzn/image/upload/v1663407669/pern-chat/attachments${process.env.NODE_ENV === "development" ? "/dev" : ""}/${attachedFileInfo.cloudinaryPublicUrl}`} />
                    </div>
                    :
                    attachedFileInfo.mimeType.includes("video/") ?
                        <div className={classes.vidContainer}>
                            {/*@ts-ignore-error*/}
                            <video controls>
                                <source src={`https://res.cloudinary.com/dzpzb3uzn/video/upload/v1510668637/pern-chat/attachments${process.env.NODE_ENV === "development" ? "/dev" : ""}/${attachedFileInfo.cloudinaryPublicUrl}`}/>
                            </video>
                        </div>
                        :
                        <>
                            misc file download
                        </>}
            </div>
        </div>
    )
}

export default AttachmentViewer