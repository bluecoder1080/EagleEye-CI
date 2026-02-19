import { ENDPOINTS } from "./constants";
import type {
  AgentRun,
  AnalyzeRequest,
  AnalyzeResponse,
  HealthResponse,
  RunAgentRequest,
} from "@/types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.message || body.error || `Request failed (${res.status})`,
    );
  }

  return res.json() as Promise<T>;
}

export async function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>(ENDPOINTS.health);
}

export async function triggerAgent(
  payload: RunAgentRequest,
): Promise<AgentRun> {
  const res = await request<{
    success: boolean;
    message: string;
    data?: AgentRun;
  }>(ENDPOINTS.runAgent, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.success || !res.data) {
    throw new Error(res.message || "Agent run failed");
  }
  return res.data;
}

export async function analyzeRepo(
  payload: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>(ENDPOINTS.analyze, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
