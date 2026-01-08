import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cluodinary.js";

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
    owner: userId,
  });

  if (!video) {
    throw new ApiError(500, "Error in publishing the video. Try again!");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video uploaded successfully!"));
});

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  const match = {};

  if (query) {
    match.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  if (!userId) {
    throw new ApiError(400, "Enter a user id!");
  }

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id!");
  }

  match.owner = new mongoose.Types.ObjectId(userId);

  const sort = {};
  if (sortBy) {
    sort[sortBy] = sortType === "desc" ? -1 : 1;
  } else {
    sort.createdAt = -1;
  }

  const videoAggreggate = Video.aggregate([
    {
      $match: match,
    },
    {
      $sort: sort,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$ownerDetails",
        },
      },
    },
    {
      $project: {
        ownerDetails: 0,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const videos = await Video.aggregatePaginate(videoAggreggate, options);

  if (!videos) {
    throw new ApiError(500, "Failed to fetch videos, try again!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!videoId) {
    throw new ApiError(400, "Enter a video id");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(500, "Failed to fetch the video!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully!"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!videoId) {
    throw new ApiError(400, "Enter a video id!");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id!");
  }

  const deletedVideo = await Video.findByIdAndDelete({
    _id: videoId,
    owner: req.user?._id
  })

  if (!deletedVideo) {
    throw new ApiError(404, "Video not found, unsuccessful deletion!")
  }

  // TODO: delete likes, comments and presence in playlist based on user id

  
  const videoUrl = deletedVideo.videoFile;
  const thumbnailUrl = deletedVideo.thumbnail;

  await deleteFromCloudinary(videoUrl);
  await deleteFromCloudinary(thumbnailUrl);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

export { publishVideo, getAllVideos, getVideoById, deleteVideo };
