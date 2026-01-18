import { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
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

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Not a valid comment id!");
  }

  const deletedComment = await Comment.findOneAndDelete({
    _id: commentId,
    owner: req.user._id,
  });

  if (!deletedComment) {
    throw new ApiError(404, "Comment not found!");
  }

  await Like.deleteMany({
    comment: commentId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully!"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Write something to update the content!");
  }

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Not a valid comment id!");
  }

  const updatedComment = await Comment.findOneAndUpdate(
    {
      _id: commentId,
      owner: req.user._id,
    },
    {
      $set: {
        content: content,
      },
    },
    { new: true }
  );

  if (!updatedComment) {
    throw new ApiError(404, "No comment found to update!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully!"));
});

export { addComment, deleteComment, updateComment };
