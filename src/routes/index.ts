import { Router } from "express";
import healthRoute from "./health.route";
import agentRoute from "./agent.route";
import analyzeRoute from "./analyze.route";

const router = Router();

router.use("/", healthRoute);
router.use("/api", agentRoute);
router.use("/api", analyzeRoute);

export default router;
