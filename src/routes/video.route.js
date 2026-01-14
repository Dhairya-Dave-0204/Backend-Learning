import { Router } from "express";
import {
  getAllVideos,
  publishVideo,
  getVideoById,
  deleteVideo,
  updateVideo,
  togglePublishStatus,
} from "../controllers/video.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const videoRouter = Router();
videoRouter.use(verifyJWT); // Apply the auth middleware to all routes in the File

videoRouter.route("/publish").post(
  upload.fields([
    {
      name: "video",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishVideo
);

videoRouter.route("/user").get(getAllVideos);

videoRouter.route("/:videoId").get(getVideoById);

videoRouter.route("/:videoId").delete(deleteVideo);

videoRouter.route("/:videoId").patch(upload.single("thumbnail"), updateVideo);

videoRouter.route("/:videoId/toggle-publish").patch(togglePublishStatus);

export default videoRouter