import classes from "./ProgressBar.module.scss"

export default function ProgressBar({ percent }: { percent: number }) {
    return (
        <div className={classes.container}>
            <div style={{width:`${percent}%`}} className={classes.progress}/>
        </div>
    )
}