import { ENDPOINTS } from "./constants";
import type {
  AgentRun,
  AnalyzeRequest,
  AnalyzeResponse,
  HealthResponse,
  RunAgentRequest,
  TimelineEntry,
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

// ── SSE Streaming API ─────────────────────────────────────────

export interface StreamCallbacks {
  onProgress: (entry: TimelineEntry) => void;
  onResult: (result: AgentRun) => void;
  onError: (error: string) => void;
  onDone: () => void;
}

export async function triggerAgentStream(
  payload: RunAgentRequest,
  callbacks: StreamCallbacks,
): Promise<void> {
  const response = await fetch(ENDPOINTS.runAgentStream, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Request failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      let currentEventType = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);

            switch (currentEventType) {
              case "progress":
                callbacks.onProgress(parsed as TimelineEntry);
                break;
              case "result":
                if (parsed.data) {
                  callbacks.onResult(parsed.data as AgentRun);
                }
                break;
              case "error":
                callbacks.onError(parsed.message || "Unknown error");
                break;
              case "done":
                callbacks.onDone();
                break;
            }
          } catch {
            // Ignore parse errors
          }
          currentEventType = "";
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
