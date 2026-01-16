import { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { videoId } = req.params;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Write something in the content!");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Enter a valid video ID!");
  }

  const video = await Video.exists({ _id: videoId });

  if (!video) throw new ApiError(404, "Video not found/fetched!");

  const comment = await Comment.create({
    content: content,
    owner: req.user._id,
    video: videoId,
  });

  const populatedComment = await comment.populate("owner", "username avatar");

  return res
    .status(201)
    .json(
      new ApiResponse(201, populatedComment, "Comment added successfully!")
    );
});

export { addComment };
