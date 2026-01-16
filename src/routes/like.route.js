import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { toggleVideoLike, toggleCommentLike, toggleTweetLike } from "../controllers/like.controllers.js";

const likeRouter = Router()
likeRouter.use(verifyJWT)
// TODO: test the routes for comment and tweet after creation of the respective

likeRouter.route("/:videoId/like").post(toggleVideoLike)
likeRouter.route("/:commentId/like").post(toggleCommentLike)
likeRouter.route("/:tweetId/like").post(toggleTweetLike)

export default likeRouter