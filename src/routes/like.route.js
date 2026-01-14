import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { toggleVideoLike } from "../controllers/like.controllers.js";

const likeRouter = Router()
likeRouter.use(verifyJWT)

likeRouter.route("/:vidoeId/like").post(toggleVideoLike)

export default likeRouter