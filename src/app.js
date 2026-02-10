import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// The standard production practice is as follows import the routes here and then declare
import userRouter from "./routes/user.routes.js";
import healthRouter from "./routes/healthcheck.route.js";
import videoRouter  from "./routes/video.route.js";
import likeRouter from "./routes/like.route.js"
import commentRouter from "./routes/comment.routes.js"
import tweetRouter  from "./routes/tweet.route.js";

// Routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/healthcheck", healthRouter)
app.use("/api/v1/video", videoRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/tweets", tweetRouter)
// Generally in production ruotes have proper defination like is it an api or the version etc

export { app };
