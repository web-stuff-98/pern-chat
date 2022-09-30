import { useAuth } from "../../context/AuthContext"
import { useInterface } from "../../context/InterfaceContext"
import { useUserDropdown } from "../../context/UserDropdownContext"
import IUser from "../../interfaces/IUser"
import classes from "./User.module.scss"

export default function User({ usersData, noClick, date, reverse, noPfp }: { usersData: IUser, noClick?: boolean, date?: Date, reverse?: boolean, noPfp?: boolean }) {
    const { openUserDropdown } = useUserDropdown()
    const { state: iState } = useInterface()
    const { user } = useAuth()

    return (
        <div style={{
            ...(reverse ? {
                flexDirection: "row-reverse"
            } : {}),
            ...((usersData && user && user.id === usersData.id) || noClick ? {
                cursor: "auto"
            } : {})
        }} onClick={() => { if (user && user.id !== usersData.id && !noClick) { openUserDropdown(usersData.id) } }} className={classes.container}>
            {usersData && <>
                {!noPfp && <div className={classes.pfp} style={usersData.base64pfp ? {
                    backgroundImage: `url(${usersData.base64pfp})`
                } : {
                    backgroundImage: `url(/pfp${iState.darkMode ? "_dark" : ""}.jpg)`
                }} />}
                <div style={reverse ? { alignItems: "flex-end" } : {}} className={classes.text}>
                    <div className={classes.name}>
                        {usersData.username}
                    </div>
                    {date && <div className={classes.dateTime}>
                        <div>{date.toLocaleString('en-GB', { timeZone: "UTC" }).split(", ")[0]}</div>
                        <div>{date.toLocaleString('en-GB', { timeZone: "UTC" }).split(", ")[1]}</div>
                    </div>}
                </div>
            </>}
        </div>
    )
}