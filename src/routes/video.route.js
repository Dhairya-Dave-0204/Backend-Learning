import { Router } from "express";
import { publishVideo } from "../controllers/video.controllers";
import { verifyJWT } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";

export const videoRouter = Router();
videoRouter.use(verifyJWT); // Apply the auth middleware to all routes in the File

videoRouter.route("/publish").post(
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishVideo
);

