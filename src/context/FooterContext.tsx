import { createContext, ReactNode, useContext, useReducer } from "react";

const initialState = {
    currentSection: 0
}

type State = typeof initialState
type Action = Partial<State>
type Dispatch = (action: Action) => void

const FooterContext = createContext<
    {
        state: State,
        dispatch: Dispatch,
    } | any
>(undefined)

const footerReducer = (state: State, action: Action) => ({
    ...state, ...action
})

export const FooterProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(footerReducer, initialState)
    return (
        <FooterContext.Provider value={{ state, dispatch }}>
            {children}
        </FooterContext.Provider>
    )
}

const useFooter = () => useContext(FooterContext)
export default useFooter