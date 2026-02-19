import dotenv from "dotenv";
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  github: {
    token: string;
    owner: string;
    repo: string;
  };
  nvidia: {
    apiUrl: string;
    apiKey: string;
  };
  teamName: string;
  leaderName: string;
  retryLimit: number;
  agentTimeoutMs: number;
  webhookUrl: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function loadConfig(): AppConfig {
  return {
    port: parseInt(optionalEnv("PORT", "3000"), 10),
    nodeEnv: optionalEnv("NODE_ENV", "development"),
    github: {
      token: optionalEnv("GITHUB_TOKEN", ""),
      owner: optionalEnv("GITHUB_OWNER", ""),
      repo: optionalEnv("GITHUB_REPO", ""),
    },
    nvidia: {
      apiUrl: optionalEnv(
        "NVIDIA_API_URL",
        "https://integrate.api.nvidia.com/v1/chat/completions",
      ),
      apiKey: optionalEnv("NVIDIA_API_KEY", ""),
    },
    teamName: optionalEnv("TEAM_NAME", "TEAM"),
    leaderName: optionalEnv("LEADER_NAME", "LEADER"),
    retryLimit: parseInt(optionalEnv("RETRY_LIMIT", "5"), 10),
    agentTimeoutMs: parseInt(optionalEnv("AGENT_TIMEOUT_MS", "30000"), 10),
    webhookUrl: optionalEnv("WEBHOOK_URL", ""),
  };
}

export const config = loadConfig();
