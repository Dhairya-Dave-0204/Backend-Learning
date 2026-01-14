import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const likeRouter = Router()
likeRouter.use(verifyJWT)

export default likeRouter