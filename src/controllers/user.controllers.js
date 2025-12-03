import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cluodinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
      $set: {
        refreshToken: undefined,
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

export { registerUser, loginUser, logoutUser };
