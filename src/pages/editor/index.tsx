import classes from "./Editor.module.scss"
import formClasses from "../../../styles/FormClasses.module.scss"
import { useFormik } from "formik"
import type { ChangeEvent } from "react"
import { useRef, useState, useEffect } from "react"
import axios, { AxiosError, AxiosRequestConfig } from "axios"
import { useInterface } from "../../context/InterfaceContext"
import { useRouter } from "next/router"
import { IResponseMessage } from "../../interfaces/GeneralInterfaces"
import HelpButton from "../../components/helpButton/HelpButton"
import Image from "next/image"
import has from "lodash/has"
import ProgressBar from "../../components/progressBar/ProgressBar"

//dynamic import that stops 'document is not defined' error loading quill
//you will get errors if you put this above the other imports.
const ReactQuill = typeof window === 'object' ? require('react-quill') : () => false;

export default function Editor() {
    const hiddenFileInputRef = useRef<HTMLInputElement>(null)

    const { state: iState } = useInterface()
    const { query: { postId } } = useRouter()
    const [isEditing, setIsEditing] = useState(false)

    const [progress, setProgress] = useState(0)
    const [resMsg, setResMsg] = useState<IResponseMessage>({ message: '', error: false, pending: false })

    const loadPostIntoEditor = async () => {
        try {
            setResMsg({ message: '', error: false, pending: true })
            const axres = await axios({
                method: "GET",
                url: `/api/post?postId=${postId}`,
                headers: { "Content-type": "application/json;charset=UTF-8" }
            })
            formik.setFieldValue('title', axres.data.title)
            formik.setFieldValue('description', axres.data.description)
            formik.setFieldValue('content', axres.data.content)
            formik.setFieldValue('tags', "#" + axres.data.tags.join("#"))
            setResMsg({ message: '', error: false, pending: false })
        } catch (e: AxiosError | any) {
            if (e.response && e.response.data.message) {
                setResMsg({ message: e.response.data.message, error: true, pending: false })
            } else {
                setResMsg({ message: `${e}`, error: true, pending: false })
            }
        }
    }

    const generateRandomPost = async () => {
        try {
            setResMsg({ message: '', error: false, pending: true })
            const axres = await axios({
                method: "GET",
                url: "/api/random-post"
            })
            formik.setFieldValue('title', axres.data.title)
            formik.setFieldValue('description', axres.data.description)
            formik.setFieldValue('content', axres.data.content)
            formik.setFieldValue('tags', "#" + axres.data.tags.join("#"))
            setResMsg({ message: '', error: false, pending: false })
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? setResMsg({ message: e.response.data.message, error: true, pending: false }) : setResMsg({ message: `${e}`, pending: false, error: true }))
                    : setResMsg({ message: `${e}`, pending: false, error: true })
            }
        }
    }

    useEffect(() => {
        const ied = postId ? true : false
        setIsEditing(ied)
        if (ied) {
            loadPostIntoEditor()
        }
    }, [postId])

    const formik = useFormik({
        initialValues: {
            content: '',
            title: '',
            description: '',
            base64coverImage: '',
            tags: '',
        },
        //validationSchema: PostValidateSchema, 
        onSubmit: async (values) => {
            try {
                setProgress(0)
                setResMsg({ message: isEditing ? 'Updating...' : 'Uploading...', pending: true, error: false })
                if (!values.base64coverImage && !isEditing) throw new Error("You must select a cover image")
                /* upload data */
                const axres = await axios({
                    method: isEditing ? "PATCH" : "POST",
                    url: "/api/post",
                    headers: { "Content-type": "application/json;charset=UTF-8" },
                    withCredentials: true,
                    data: isEditing ? { ...values, postId: Number(postId) } : values,
                })
                if (values.base64coverImage) {
                    /* upload image */
                    const formData = new FormData()
                    const coverImage = await (await fetch(values.base64coverImage)).blob()
                    formData.append("file", coverImage)
                    const axiosConfig: AxiosRequestConfig = {
                        onUploadProgress: (progressEvent) => setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total)),
                        withCredentials: true,
                        headers: {
                            'Content-Type': 'multipart/form-data; boundary=XXX',
                        }
                    }
                    const url = `/api/postImage?postId=${isEditing ? Number(postId) : axres.data.id}`
                    isEditing ? await axios.put(url, formData, axiosConfig) : await axios.post(url, formData, axiosConfig)
                }
                setResMsg({ message: isEditing ? 'Post updated. Updates to cover images will take a little while to show, and will require refreshing.' : 'Blog post created - page and links will be generated within 30 seconds', pending: false, error: false })
                //setGenerating(false)
            } catch (e: AxiosError | any) {
                if (axios.isAxiosError(e)) {
                    e.response ?
                        //@ts-ignore-error
                        (has(e.response, "data") ? setResMsg({ message: e.response.data.message, error: true, pending: false }) : setResMsg({ message: `${e}`, pending: false, error: true }))
                        : setResMsg({ message: `${e}`, pending: false, error: true })
                }
            }
        }
    })

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, false] }],
            ["bold", "italic", "underline"],
            [
                "image",
                "link",
            ],
            [
                { list: "ordered" },
                { list: "bullet" }
            ],
            ['blockquote'],
        ]
    }

    const setContent = (to: string) => {
        formik.setFieldValue('content', to, true)
    }

    const handleImage = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files![0]) return
        const fr = new FileReader()
        fr.readAsDataURL(e.target.files![0])
        fr.onloadend = () => {
            setBase64coverImage(String(fr.result))
            formik.setFieldValue('base64coverImage', fr.result)
        }
    }

    const [base64coverImage, setBase64coverImage] = useState('')

    const getRandomImage = async () => {
        try {
            const axres = await axios({
                method: "GET",
                url: `https://picsum.photos/${Math.random() > 0.5 ? 700 : 400}/${Math.random() > 0.5 ? 700 : 400}`,
                headers: { "Content-type": "image/jpeg" },
                responseType: "arraybuffer"
            })
            const bufferString = Buffer.from(axres.data, "binary").toString("base64")
            const base64 = `data:image/jpeg;base64, ${bufferString}`
            setBase64coverImage(base64)
            formik.setFieldValue('base64coverImage', base64)
        } catch (e: AxiosError | any) {
            if (axios.isAxiosError(e)) {
                e.response ?
                    //@ts-ignore-error
                    (has(e.response, "data") ? setResMsg({ message: e.response.data.message, error: true, pending: false }) : setResMsg({ message: `${e}`, pending: false, error: true }))
                    : setResMsg({ message: `${e}`, pending: false, error: true })
            }
        }
    }

    /*const [generating, setGenerating] = useState(false)
    const createAndUploadRandomPost = async () => {
        setGenerating(true)
        await getRandomImage()
        await generateRandomPost()
        await formik.submitForm()
    }
    useEffect(() => {
        const i = setInterval(() => {
            if (!generating)
                createAndUploadRandomPost()
        }, 6000)
        return () => clearInterval(i)
    }, [])*/

    return (
        <form onSubmit={formik.handleSubmit} className={classes.container}>
            <div className={classes.inner}>
                <div className={classes.quillContainer}>
                    <label htmlFor="content"><HelpButton text="<p>Make sure that you put in your title as a heading size one at the beginning. You can copy paste emojis and images into the editor, including transparent PNGs.</p>" />Post content</label>
                    {iState.iExist && <ReactQuill name="content" id="content" modules={modules} theme="snow" value={formik.values.content} onChange={setContent} />}
                </div>
                <div className={formClasses.inputLabelWrapper}>
                    <label htmlFor="title"><HelpButton text="Your post title will not be visible on the generated blog page, so make sure to include your title in the editor aswell. Changing the title will not update the URL for the post, the URL cannot be changed. You can also paste emojis (ISO code icons)" />Post title ({formik.values.title.length}/90)</label>
                    <input name="title" id="title" value={formik.values.title} onChange={formik.handleChange} type="text" />
                </div>
                <div className={formClasses.inputLabelWrapper}>
                    <label htmlFor="description"><HelpButton text="You can paste emojis (ISO code icons)" />Post description ({formik.values.description.length}/130)</label>
                    <textarea name="description" id="description" value={formik.values.description} onChange={formik.handleChange} />
                </div>
                <div className={formClasses.inputLabelWrapper}>
                    <label htmlFor="tags"><HelpButton text="Start each tag with #. Maximum 8 tags. You can also input short phrases inside your tags, think of what people will look for using google." />Tags ({formik.values.tags.length}/70)</label>
                    <textarea name="tags" id="tags" value={formik.values.tags} onChange={formik.handleChange} />
                </div>
                <input accept=".jpg,.jpeg,.png,.avif,.webp,.avif,.tiff" onChange={handleImage} ref={hiddenFileInputRef} type="file" style={{ display: "none" }} />
                <button type="button" onClick={() => generateRandomPost()}>Random body</button>
                <button type="button" onClick={() => getRandomImage()}>Random cover image (lorem picsum)</button>
                <button type="button" onClick={() => hiddenFileInputRef.current?.click()}>Select a cover image</button>
                <button type="submit">{isEditing ? "Update post" : "Submit post"}</button>
                {resMsg.pending && <div style={{ marginTop: "var(--padding-base)" }}><ProgressBar percent={progress} /></div>}
                {resMsg.message && <span className={classes.serverResponse}>
                    {resMsg.message.replace("ValidationError: ", "").replace("base64coverImage", "cover image")}
                </span>}
                {(base64coverImage || (isEditing && !base64coverImage)) &&
                    <div className={classes.imageContainer}>
                        <Image layout="fill" src={isEditing && !base64coverImage ? `https://res.cloudinary.com/dzpzb3uzn/image/upload/v1663407669/pern-chat/posts${process.env.NODE_ENV === "development" ? "/dev" : ""}/${postId}` : base64coverImage} />
                    </div>
                }
            </div>
        </form>
    )
}

Editor.requiresAuth = true