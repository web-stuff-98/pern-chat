/**
 * https://stackoverflow.com/questions/33631041/javascript-async-await-in-replace
 * ^ was confused
 * 
 * Takes in HTML content
 * 
 * Then outputs the HTML content with all the <img/> tags src
 * base64 src attributes optimized
 * (as really low quality jpegs and pngs)
 */

import sharp from "sharp"
import has from "lodash/has"

//because its not possible to do async in .replace
//copy pasted off stack overflow.
async function replaceAsync(str, regex, asyncFn) {
    const promises = [];
    str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args);
        promises.push(promise);
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift());
}

const replaceImage = (match) => {
    const src = match.replace(/.*src="([^"]*)".*/, '$1').replace(/^data:image\/[a-z]+;base64,/, "")
    const buffer = Buffer.from(src, 'base64url')
    const image = sharp(buffer)
    return new Promise((resolve, reject) => {
        image.metadata((err, metadata) => {
            if (!has(metadata, "width")) reject("No metadata on image")
            if (err) reject(err)
            if (!has(metadata, "format")) reject("Format incompatible")
            const width = metadata.width
            const height = metadata.height
            const resizeOptions = {
                ...(width > height ? {
                    width: Math.min(400, width)
                } : {
                    height: Math.min(400, height)
                })
            }
            const transparency = (metadata.format === "png" || metadata.format === "webp")
            let readyImg
            //save with transparency
            if (transparency)
                readyImg = image.resize(resizeOptions)
                    .png({
                        quality: 80,
                        compressionLevel: 9,
                        palette: true,
                        force: true,
                    })
            else
                //save as jpeg
                readyImg = image.resize(resizeOptions)
                    .jpeg({
                        quality: 80,
                        mozjpeg: true,
                        force: true,
                    })
            readyImg.toBuffer((err, img) => {
                if (err) reject(err)
                if (!img) reject("No output result")
                resolve(`<img src="data:image/${transparency ? "png" : "jpeg"};base64,${img.toString('base64')}"/>`)
            })
        })
    })
}

export default async function embeddedImageProcessing(inHtml) {
    const html_original_imgs = inHtml.match(/<img [^>]*src="[^"]*"[^>]*>/gm)
    if(!html_original_imgs) return inHtml
    if (html_original_imgs.length === 0) return inHtml
    return replaceAsync(inHtml, /<img [^>]*src="[^"]*"[^>]*>/gm, replaceImage)
    //return inHtml.replace(/<img [^>]*src="[^"]*"[^>]*>/gm, replaceImage)
    //console.log(`Original srcs length : ${html_original_srcs.join("").length}  |  New srcs length : ${html_srcs.join("").length}`)
}