import { Router } from "express";
import { healthCheck } from "../controllers/healthcheck.controllers.js";

const healthRouter = Router();

healthRouter.route("/").get(healthCheck);

export default healthRouter;