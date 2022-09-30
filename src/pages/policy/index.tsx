import classes from "./Policy.module.scss"

export default function Policy() {
    return(
        <div className={classes.container}>
            <h1>Cookies + Privacy policy</h1>
            <p>A cookie is a chunk of data generated by a server used to track users. In the case of this website a single cookie called &quot;token&quot; is used to facilitate your login session, your data is never sold or shared with any 3rd party. Everything except for the example data is deleted automatically after 20 minutes, including accounts.</p>
        </div>
    )
}