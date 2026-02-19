import { create } from "zustand";
import type { AgentRun, DashboardStats } from "@/types";
import { triggerAgent } from "@/lib/api";
import type { RunAgentRequest } from "@/types";

interface AgentState {
  runs: AgentRun[];
  activeRun: AgentRun | null;
  result: AgentRun | null;
  isRunning: boolean;
  error: string | null;

  stats: DashboardStats;

  startRun: (payload: RunAgentRequest) => Promise<void>;
  setActiveRun: (run: AgentRun | null) => void;
  addRun: (run: AgentRun) => void;
  clearError: () => void;
  clearResult: () => void;
}

function computeStats(runs: AgentRun[]): DashboardStats {
  const totalRuns = runs.length;
  const passedRuns = runs.filter((r) => r.status === "PASSED").length;
  const failedRuns = runs.filter((r) => r.status === "FAILED").length;
  const totalFixesApplied = runs.reduce((sum, r) => sum + r.totalFixes, 0);
  const averageTime =
    totalRuns > 0
      ? Math.round(runs.reduce((sum, r) => sum + r.timeTaken, 0) / totalRuns)
      : 0;

  return { totalRuns, passedRuns, failedRuns, totalFixesApplied, averageTime };
}

export const useAgentStore = create<AgentState>((set, get) => ({
  runs: [],
  activeRun: null,
  result: null,
  isRunning: false,
  error: null,
  stats: {
    totalRuns: 0,
    passedRuns: 0,
    failedRuns: 0,
    totalFixesApplied: 0,
    averageTime: 0,
  },

  startRun: async (payload) => {
    set({ isRunning: true, error: null });
    try {
      const result = await triggerAgent(payload);
      const run: AgentRun = {
        ...result,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      const runs = [run, ...get().runs];
      set({
        runs,
        activeRun: run,
        result: run,
        isRunning: false,
        stats: computeStats(runs),
      });
    } catch (err) {
      set({
        isRunning: false,
        error: err instanceof Error ? err.message : "Unknown error occurred",
      });
    }
  },

  setActiveRun: (run) => set({ activeRun: run }),

  addRun: (run) => {
    const runs = [run, ...get().runs];
    set({ runs, stats: computeStats(runs) });
  },

  clearError: () => set({ error: null }),
  clearResult: () => set({ result: null }),
}));
