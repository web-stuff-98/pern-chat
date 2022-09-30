interface IPost {
    title: string,
    description: string,
    content?: string,
    timestamp: number,
    slug: string,
    tags: string[],
    owner: number,
    id: number,
    image_blur: string,
}
export default IPost