import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos } from "../controllers/like.controllers.js";

const likeRouter = Router()
likeRouter.use(verifyJWT)
// TODO: test the routes for comment and tweet after creation of the respective

likeRouter.route("/:videoId/video-like").post(toggleVideoLike)
likeRouter.route("/:commentId/comment-like").post(toggleCommentLike)
likeRouter.route("/:tweetId/tweet-like").post(toggleTweetLike)
likeRouter.route("/liked-videos").get(getLikedVideos)

export default likeRouter