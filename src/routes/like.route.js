import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { toggleVideoLike, toggleCommentLike } from "../controllers/like.controllers.js";

const likeRouter = Router()
likeRouter.use(verifyJWT)

likeRouter.route("/:videoId/like").post(toggleVideoLike)
likeRouter.route("/:commentId/like").post(toggleCommentLike)

export default likeRouter