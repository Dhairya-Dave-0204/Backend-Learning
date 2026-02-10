import { Router } from "express";
import { createPlaylist } from "../controllers/playlist.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const playlistRouter = Router()

playlistRouter.use(verifyJWT)

playlistRouter.route("/create").post(createPlaylist)

export default playlistRouter