import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "The video id is incorrect!");
  }

  const removedLike = await Like.findOneAndDelete({
    video: videoId,
    likedBy: req.user._id,
  });

  if (removedLike) {
    await Video.findByIdAndUpdate(videoId, [
      {
        $set: {
          likes: {
            $max: [{ $subtract: ["$likes", 1] }, 0],
          },
        },
      },
    ]);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Like removed from the video!"));
  }

  await Like.create({
    video: videoId,
    likedBy: req.user._id,
  });

  await Video.findByIdAndUpdate(videoId, {
    $inc: { likes: 1 },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Video liked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Inavalid comment id! ");
  }
});

export { toggleVideoLike, toggleCommentLike };
