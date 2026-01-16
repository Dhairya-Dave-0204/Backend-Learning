import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { addComment } from "../controllers/comment.controllers.js"

const commentRouter = Router()
commentRouter.use(verifyJWT)

commentRouter.route("/:videoId/add-comment").post(addComment)

export default commentRouter