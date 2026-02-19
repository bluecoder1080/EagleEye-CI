import { Router, Request, Response } from "express";
import { createLogger } from "../utils";

const logger = createLogger("HealthRoute");
const router = Router();

interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  version: string;
}

router.get("/health", (_req: Request, res: Response) => {
  const health: HealthResponse = {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  };

  logger.debug("Health check requested");
  res.json(health);
});

export default router;
