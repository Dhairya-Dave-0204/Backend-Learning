import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cluodinary.js";

const publishVideo = asyncHandler(async (req, res) => {
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

  if (!videoId) {
    throw new ApiError(400, "Enter a video id!");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id!");
  }

  const deletedVideo = await Video.findByIdAndDelete({
    _id: videoId,
    owner: req.user?._id,
  });

  if (!deletedVideo) {
    throw new ApiError(404, "Video not found, unsuccessful deletion!");
  }

  await Like.deleteMany({ video: videoId });
  await Comment.deleteMany({ video: videoId });

  await Playlist.updateMany({ video: videoId }, { $pull: { video: videoId } });

  const videoUrl = deletedVideo.videoFile;
  const thumbnailUrl = deletedVideo.thumbnail;

  await deleteFromCloudinary(videoUrl);
  await deleteFromCloudinary(thumbnailUrl);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const newThumbnailLocal = req.file?.path;

  if (!videoId) {
    throw new ApiError(400, "Video id not found!");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Not a valid video id!");
  }

  if (!title && !description && !newThumbnailLocal) {
    throw new ApiError(400, "Enter proper updation details!");
  }

  let newThumbnailUrlCloudinary;

  if (newThumbnailLocal) {
    const uploaded = await uploadOnCloudinary(newThumbnailLocal);
    if (!uploaded?.url) {
      throw new ApiError(500, "Thumbnail upload failed");
    }
    newThumbnailUrlCloudinary = uploaded.url;
  }

  const updatedVideo = await Video.findOneAndUpdate(
    {
      _id: videoId,
      owner: req.user._id, // ownership enforced here
    },
    {
      $set: {
        ...(title && { title }),
        ...(description && { description }),
        ...(newThumbnailUrlCloudinary && {
          thumbnail: newThumbnailUrlCloudinary,
        }),
      },
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(404, "Video not found or not authorized");
  }

  if (newThumbnailUrlCloudinary) {
    await deleteFromCloudinary(updatedVideo.thumbnail);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video details updated successfully!")
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "The video id is incorrect");
  }

  const updatedVideoToggle = await Video.findByIdAndUpdate(
    {
      _id: videoId,
      owner: req.user._id,
    },
    [
      {
        $set: {
          isPublished: { $not: "$isPublished" },
        },
      },
    ],
    {
      new: true,
    }
  );

  if (!updatedVideoToggle) {
    throw new ApiError(404, "Error in updating the video status!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideoToggle,
        "Video status updated succesfully!"
      )
    );
});

export {
  publishVideo,
  getAllVideos,
  getVideoById,
  deleteVideo,
  updateVideo,
  togglePublishStatus,
};
