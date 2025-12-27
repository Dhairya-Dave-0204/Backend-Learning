import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cluodinary.js";

const publishVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  /* Algo for uploading the video 
    S1 Get the video, title and description from the request
    S2 check if the video, title and description is valid
    S3 upload the video to server (multer)
    S4 upload on cloudinary
    S5 validate the data incoming from cloudinary
    S6 if ok, then store the data like video URl and duration into the database.
  */
  const { title, description } = req.body;

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Title or Description missing!");
  }

  const videoLocalPath = req.files?.video[0].path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video missing, upload a video!");
  }

  const thumbnailLocalPath = req.files?.thumbnail[0].path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail missing, upload a thumbnail!");
  }

  const videoCloudinary = await uploadOnCloudinary(videoLocalPath);
  const thumbnaiCloudinary = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoCloudinary) {
    throw new ApiError(500, "Error in uploading video on cloudinary");
  }

  if (!thumbnaiCloudinary) {
    throw new ApiError(500, "Error in uploading thumbnail on cloudinary");
  }

  const userId = req.user?._id;

  const video = await Video.create({
    title,
    description,
    thumbnail: thumbnaiCloudinary.url,
    videoFile: videoCloudinary.url,
    duration: videoCloudinary.duration,
    user: userId,
  });

  if (!video) {
    throw new ApiError(500, "Error in publishing the video. Try again!");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video uploaded successfully!"));
});

export { publishVideo };
