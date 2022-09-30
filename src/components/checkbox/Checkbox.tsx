import classes from "./Checkbox.module.scss"
import { TiTick } from "react-icons/ti"

export default function Checkbox({
    id,
    value = false,
    setValue = () => { },
}: {
    id: string,
    value?: boolean,
    setValue: (to: boolean) => void
}) {
    return (
        <div onClick={() => setValue(!value)} id={id} className={classes.container}>
            {value && <TiTick />}
        </div>
    )
}