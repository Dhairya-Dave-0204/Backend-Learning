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

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(500, "Cannot fetch the video video document!");
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user_id,
  });

  if (existingLike) {
    await existingLike.deleteOne();

    video.likes -= 1;

    await video.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Like removed from the video!"));
  } else {
    const like = await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });

    video.likes += 1;

    await video.save();

    const updatedLike = await like.populate("likedBy", "username avatar");

    return res
      .status(201)
      .json(
        new ApiResponse(201, { updatedLike }, "Successfully liked the video!")
      );
  }
});

export { toggleVideoLike };
