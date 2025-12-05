import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

dotenv.config({
  path: "./.env",
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // uploading process
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // successful upload
    // console.log("File uploaded on Cloudinary \n ", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temp file as upload failed
    return null;
  }
};

const deleteFromCloudinary = async (fileUrl) => {
  if (!fileUrl) {
    return null;
  }
  try {
    // Example URL:
    // https://res.cloudinary.com/demo/image/upload/v1712345678/folder/filename_xyz.jpg
    const parts = fileUrl.split("/");
    const fileName = parts.pop(); // "filename_xyz.jpg"
    const publicId = fileName.split(".")[0]; // "filename_xyz"
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
    return response;
  } catch (error) {
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
