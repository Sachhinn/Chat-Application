import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'

const uploadOnCloudinary = async (localFilePath) => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    try {
        if (!localFilePath) { return null; }
        let response = await cloudinary.uploader.upload(localFilePath, { resource_type: 'auto' })
        console.log('File is uploaded on cloudinary : ', response.url)
        return response;
    } catch (error) {
        console.log(error)
        fs.unlinkSync(localFilePath); // Remove the temporary saved file
        return null;
    }
}
const uploadOnCloudinaryWithPublicId = async (localFilePath , publicId) => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    try {
        if (!localFilePath) { return null; }
        let response = await cloudinary.uploader.upload(localFilePath, { resource_type: 'auto', public_id:publicId})
        console.log('File is uploaded on cloudinary : ', response.url)
        return response;
    } catch (error) {
        console.log(error)
        return null;
    }
}


export { uploadOnCloudinary , uploadOnCloudinaryWithPublicId}