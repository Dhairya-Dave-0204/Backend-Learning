import { Router } from "express";
import { publishVideo } from "../controllers/video.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

export const videoRouter = Router();
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

