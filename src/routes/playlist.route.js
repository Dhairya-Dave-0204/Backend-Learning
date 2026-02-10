import { Router } from "express";
import { createPlaylist, getUserPlaylist } from "../controllers/playlist.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const playlistRouter = Router()

playlistRouter.use(verifyJWT)

playlistRouter.route("/create").post(createPlaylist)
playlistRouter.route("/playlist").get(getUserPlaylist)

export default playlistRouter