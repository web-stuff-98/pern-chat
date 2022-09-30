import { useContext, createContext, useReducer, ReactNode, useEffect } from "react"

const initialState = {
    closeAllDropdowns: false, /* true when backdrop clicked, to trigger useeffects in dropdown components that close them */
    dropdownOpen: false, /* true when any dropdown is open */
}
type State = typeof initialState
type Action = Partial<State>

type Dispatch = (action: Action) => void

const DropdownContext = createContext<
    { state: State, dispatch: Dispatch } | undefined
>(undefined)

const dropdownReducer = (state: State, action: Action) => { return { ...state, ...action } }

const DropdownProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(dropdownReducer, initialState)
    useEffect(() => { if (state.closeAllDropdowns) dispatch({ closeAllDropdowns: false }) }, [state.closeAllDropdowns])
    return (
        <DropdownContext.Provider value={{ state, dispatch }}>
            {children}
        </DropdownContext.Provider>
    )
}

const useDropdown = () => {
    const context = useContext(DropdownContext)
    if (!context) throw new Error("Use dropdown from inside dropdown provider")
    return context
}

export { useDropdown, DropdownProvider }

