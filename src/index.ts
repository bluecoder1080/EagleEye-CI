import express from "express";
import { config, createLogger } from "./utils";
import routes from "./routes";

const logger = createLogger("Server");

const app = express();

// CORS for frontend
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(routes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error(`Unhandled error: ${err.message}`, err.stack);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  },
);

const server = app.listen(config.port, () => {
  logger.info(`Autonomous CI/CD Healing Agent – RIFT 2026`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Server running on port ${config.port}`);
  logger.info(`Retry limit: ${config.retryLimit}`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down");
  server.close(() => process.exit(0));
});

export default app;
