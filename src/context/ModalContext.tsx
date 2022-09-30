import { createContext, useContext, useEffect, useReducer } from "react"
import type { ReactNode } from "react"
import { EModalType } from "../enums/GeneralEnums"

const initialState = {
    modalType: EModalType.Info,
    showModal: false
}

type State = { modalType: EModalType, showModal: boolean }
type Action = Partial<State>
type Dispatch = (action: Action) => void

const modalReducer = (state: State, action: Partial<State>) => {
    return { ...state, ...action }
}

const ModalContext = createContext<
    { state: State, dispatch: Dispatch }
>({ state: initialState, dispatch: () => { } })

export const ModalProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(modalReducer, initialState)
    return (
        <ModalContext.Provider value={{ state, dispatch }}>
            {children}
        </ModalContext.Provider>
    )
}
export const useModal = () => useContext(ModalContext)