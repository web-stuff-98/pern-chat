import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"
import { useModal } from "./ModalContext"
import { EModalType } from "../enums/GeneralEnums"

type AttachedFileInfo = {
    cloudinaryPublicUrl: string,
    mimeType: string,
}

const AttachmentViewerContext = createContext<
    {
        openAttachedFile: (msgId: string, mimeType: string) => void,
        attachedFileInfo: AttachedFileInfo,
    } | any
>(undefined)

export const AttachmentViewerProvider = ({ children }: { children: ReactNode }) => {
    const { dispatch: mDispatch } = useModal()

    const [attachedFileInfo, setAttachedFileInfo] = useState<AttachedFileInfo>({ cloudinaryPublicUrl: "", mimeType: "" })

    const openAttachedFile = (msgId: string, mimeType: string) => {
        setAttachedFileInfo({ cloudinaryPublicUrl: msgId, mimeType })
        mDispatch({ showModal: true, modalType: EModalType.AttachmentViewer })
    }

    return (
        <AttachmentViewerContext.Provider value={{ attachedFileInfo, openAttachedFile }}>
            {children}
        </AttachmentViewerContext.Provider>
    )
}

const useAttachmentViewer = () => useContext(AttachmentViewerContext)
export default useAttachmentViewer