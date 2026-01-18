import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { addComment, deleteComment } from "../controllers/comment.controllers.js"

const commentRouter = Router()
commentRouter.use(verifyJWT)

commentRouter.route("/:videoId/add-comment").post(addComment)
commentRouter.route("/:commentId/delete").post(deleteComment)

export default commentRouter