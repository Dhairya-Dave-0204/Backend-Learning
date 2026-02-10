import { Router } from "express";
import { createTweet, getUserTweets } from "../controllers/tweet.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

export const tweetRouter = Router()

tweetRouter.use(verifyJWT)

tweetRouter.route("/create").post(createTweet)
tweetRouter.route("/user-tweets").get(getUserTweets)
