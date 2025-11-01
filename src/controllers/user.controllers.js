import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cluodinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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
  const existedUser = User.findOne({
    $or: [ { username }, { email } ]
  })

  if (!existedUser) {
    throw new ApiError(409, "User already exists with same email or username")
  }

  // S4 - check for images; avatar is required
  const avatarLocalPath = req.files?.avatar[0]?.path
  const coverImageLocalPath = req.files.coverImage[0]?.path

  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required!")
  }

  // S5 - upload the images to cloudinary; avatar is required
  const avatarCloudinary = await uploadOnCloudinary(avatarLocalPath)
  const coverImageCloudinary = await uploadOnCloudinary(coverImageLocalPath)
  
  if (!avatarCloudinary) {
    throw new ApiError(400, "Avatar file is required")
  }

  // S6 - create user object - create entry in database
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatarCloudinary.url,
    coverImage: coverImageCloudinary?.url || "",
    password

  })

  // S7 - remove password and refresh token from the response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  // S8 - check for user creation; if response is ok or null
  if (!createdUser) {
    throw new ApiError(500, "Server error; Registration unsuccessfful")
  }

  // S9 - return response
  return res.status(201).json(
    ApiResponse(200, createdUser, "Registration successful!")
  )
});

export { registerUser };
