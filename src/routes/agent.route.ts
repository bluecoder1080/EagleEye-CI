import { Router, Request, Response } from "express";
import { Orchestrator } from "../orchestrator";
import { createLogger } from "../utils";

const logger = createLogger("AgentRoute");
const router = Router();

export interface RunAgentRequest {
  repoUrl: string;
  teamName?: string;
  leaderName?: string;
  retryLimit?: number;
  dryRun?: boolean;
}

export interface RunAgentResponse {
  success: boolean;
  message: string;
  data?: unknown;
  timestamp: string;
}

router.post("/run-agent", async (req: Request, res: Response) => {
  const body = req.body as RunAgentRequest;

  if (!body.repoUrl || typeof body.repoUrl !== "string") {
    const response: RunAgentResponse = {
      success: false,
      message: "Missing required field: repoUrl",
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(response);
    return;
  }

  const dryRun = body.dryRun ?? false;

  logger.info(`Agent run requested: repo=${body.repoUrl}, dryRun=${dryRun}`);

  const orchestrator = new Orchestrator();

  try {
    const result = await orchestrator.run({
      repoUrl: body.repoUrl,
      teamName: body.teamName,
      leaderName: body.leaderName,
      retryLimit: body.retryLimit,
      dryRun,
    });

    const response: RunAgentResponse = {
      success: true,
      message: `Agent run completed: ${result.status}`,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Agent run failed: ${errorMsg}`);

    const response: RunAgentResponse = {
      success: false,
      message: errorMsg,
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

export default router;
