import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description || !name.trim() || !description.trim()) {
    throw new ApiError(400, "Provide details for name and description");
  }

  const playlist = await Playlist.create({
    name: name,
    description: description,
    owner: req.user._id,
  });

  if (!playlist) {
    throw new ApiError(500, "Error creating the playlist");
  }

  const populatedPlaylist = await playlist.populate("owner", "username avatar");

  return res
    .status(201)
    .json(
      new ApiResponse(201, populatedPlaylist, "Playlist created successfully")
    );
});

const getUserPlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.find({
    owner: req.user._id,
  }).sort({ createdAt: -1 });

  if (!playlist) {
    throw new ApiError(500, "Error in fetching the users playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlists fetched successfully"));
});

export { createPlaylist, getUserPlaylist };
