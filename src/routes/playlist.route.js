import { Router } from "express";
import {
  createPlaylist,
  getUserPlaylist,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
} from "../controllers/playlist.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const playlistRouter = Router();

playlistRouter.use(verifyJWT);

playlistRouter.route("/create").post(createPlaylist);
playlistRouter.route("/playlist").get(getUserPlaylist);
playlistRouter.route("/:playlistId/playlist").get(getPlaylistById);
playlistRouter
  .route("/:playlistId/video-add/:videoId")
  .post(addVideoToPlaylist);
playlistRouter
  .route("/:playlistId/video-del/:videoId")
  .delete(removeVideoFromPlaylist);

export default playlistRouter;
