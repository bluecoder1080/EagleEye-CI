import { Router, Request, Response } from "express";
import { Orchestrator, TimelineEntry } from "../orchestrator";
import { createLogger } from "../utils";

const logger = createLogger("AgentRoute");
const router = Router();

export interface RunAgentRequest {
  repoUrl: string;
  teamName?: string;
  leaderName?: string;
  retryLimit?: number;
  dryRun?: boolean;
  githubToken?: string; // User's GitHub token for pushing to their repos
}

export interface RunAgentResponse {
  success: boolean;
  message: string;
  data?: unknown;
  timestamp: string;
}

// ── Standard POST endpoint (non-streaming) ──────────────────────

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
      githubToken: body.githubToken,
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

// ── SSE streaming endpoint ─────────────────────────────────────

router.post("/run-agent-stream", async (req: Request, res: Response) => {
  const body = req.body as RunAgentRequest;

  if (!body.repoUrl || typeof body.repoUrl !== "string") {
    res.status(400).json({
      success: false,
      message: "Missing required field: repoUrl",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const dryRun = body.dryRun ?? false;

  logger.info(
    `[SSE] Agent stream requested: repo=${body.repoUrl}, dryRun=${dryRun}`,
  );

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();

  const orchestrator = new Orchestrator();

  // Helper to send SSE event
  const sendEvent = (type: string, data: unknown) => {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Progress callback - streams each timeline event
  const onProgress = (entry: TimelineEntry) => {
    sendEvent("progress", entry);
  };

  try {
    const result = await orchestrator.run({
      repoUrl: body.repoUrl,
      teamName: body.teamName,
      leaderName: body.leaderName,
      retryLimit: body.retryLimit,
      dryRun,
      onProgress,
      githubToken: body.githubToken,
    });

    // Send final result
    sendEvent("result", {
      success: true,
      message: `Agent run completed: ${result.status}`,
      data: result,
      timestamp: new Date().toISOString(),
    });

    sendEvent("done", { status: result.status });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(`[SSE] Agent run failed: ${errorMsg}`);

    sendEvent("error", {
      success: false,
      message: errorMsg,
      timestamp: new Date().toISOString(),
    });
  } finally {
    res.end();
  }
});

export default router;
