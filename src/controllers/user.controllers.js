import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cluodinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went worng while generating access and refresh token"
    );
  }
};

//   ***** Steps to register user breakdown of full logic *****
const registerUser = asyncHandler(async (req, res) => {
  // S1 - get user details from frontend
  const { username, email, fullName, password } = req.body;

  // S2 - validation of data; not empty
  // General way of checking: ** if (fullname === "") **
  // A bit advanced way to check all fields at once
  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // S3 - check if user already exists via email and username
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists with same email or username");
  }

  // S4 - check for images; avatar is required
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files.coverImage[0]?.path
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required!");
  }

  // S5 - upload the images to cloudinary; avatar is required
  const avatarCloudinary = await uploadOnCloudinary(avatarLocalPath);
  const coverImageCloudinary = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatarCloudinary) {
    throw new ApiError(400, "Avatar file is required");
  }

  // S6 - create user object - create entry in database
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatarCloudinary.url,
    coverImage: coverImageCloudinary?.url || "",
    password,
  });

  // S7 - remove password and refresh token from the response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // S8 - check for user creation; if response is ok or null
  if (!createdUser) {
    throw new ApiError(500, "Server error; Registration unsuccessfful");
  }

  // S9 - return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "Registration successful!"));
});

const loginUser = asyncHandler(async (req, res) => {
  /* 
    TODO for login
    1. get input from user
    2. validate the input for emptiness
    3. check if the user exists in the databse
    4. check password
    5. generate an access and refresh token for the user
    6. send cookie
    7. login into the site
  */

  // Step 1
  const { username, email, password } = req.body;

  // Step 2
  if (!(username || email)) {
    throw new ApiError(400, "Username or email missing");
  }

  // Step 3
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // Step 4
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password, enter agian");
  }

  // Step 5
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Step 6
  // Now we have to send cookie having user info and we have user object, but we dont want
  // some fields so there are 2 options a db call getting required fields only or
  // directly update the user object, whichever is fiseable
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // This removes the feild fromr document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request for refreshToken");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token refreshed successfuly"
        )
      );
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || "Invlaid refresh token via catch"
    );
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfuly"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json( new ApiResponse(200, req.user, "User fetched successfully") );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { email, fullName } = req.body;

  if (!(email || fullName)) {
    throw new ApiError(400, "All feilds are required");
  }

  const user = User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account detials updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const oldUserData = await User.findById(req.user?._id);
  if (!oldUserData) {
    throw new ApiError(404, "Failed to fetch user details for avatar!");
  }

  const oldAvatar = oldUserData.avatar;

  const newAvatar = await uploadOnCloudinary(avatarLocalPath);

  if (!newAvatar.url) {
    throw new ApiError(500, "Error while uploading avatar on cloudinary");
  }

  if (!oldAvatar) {
    throw new ApiError(500, "Failed to fetch old avatar image");
  }
  await deleteFromCloudinary(oldAvatar);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: newAvatar.url,
      },
    },
    { new: true }
  ).select("-password");

  res.send(200).json(new ApiResponse(200, user, "avatar updated successfully"));
});

const updateUserCover = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image missing");
  }

  const oldUserData = await User.findById(req.user?._id);
  if (!oldUserData) {
    throw new ApiError(404, "User data not found, Try again");
  }

  const oldCover = oldUserData.coverImage;

  const newCoverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!newCoverImage.url) {
    throw new ApiError(500, "Error uploading cover image to cloudinary");
  }

  if (!oldCover) {
    throw new ApiError(500, "Failed to fetch old image from cloudinary");
  }
  await deleteFromCloudinary(oldCover);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: newCoverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  res
    .send(200)
    .json(new ApiResponse(200, user, "coverImage updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing in params");
  }

  // General syntax for writing aggerate pipeline
  // User.aggerate([{}, {}, {}])
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }
  console.log(channel);
  console.log(channel[0]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "Users channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch hsitory fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCover,
  getUserChannelProfile,
  getWatchHistory,
};
