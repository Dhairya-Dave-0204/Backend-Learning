import { Router } from "express";
import { createTweet, getUserTweets, updateTweet, deleteTweet } from "../controllers/tweet.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const tweetRouter = Router()

tweetRouter.use(verifyJWT)

tweetRouter.route("/create").post(createTweet)
tweetRouter.route("/user-tweets").get(getUserTweets)
tweetRouter.route("/:tweetId/update").patch(updateTweet)
tweetRouter.route("/:tweetId/delete").delete(deleteTweet)

export default tweetRouter