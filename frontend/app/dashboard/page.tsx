"use client";

import { useState } from "react";
import { useAgentStore } from "@/store/useAgentStore";
import {
  StatsGrid,
  RunTriggerForm,
  RunCard,
  RunSummary,
  ScoreBreakdown,
  FixesTable,
  CICDTimeline,
  LiveProgress,
} from "@/components";
import { formatDuration } from "@/lib/utils";
import type { RunAgentRequest, AgentRun } from "@/types";

export default function DashboardPage() {
  const { runs, stats, result, isRunning, addRun, setActiveRun } =
    useAgentStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamPayload, setStreamPayload] = useState<RunAgentRequest | null>(
    null,
  );
  const [streamError, setStreamError] = useState<string | null>(null);

  const handleStartStream = (payload: RunAgentRequest) => {
    setStreamPayload(payload);
    setStreamError(null);
    setIsStreaming(true);
  };

  const handleStreamComplete = (resultData: AgentRun) => {
    const run: AgentRun = {
      ...resultData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    addRun(run);
    setActiveRun(run);
    setIsStreaming(false);
    setStreamPayload(null);
  };

  const handleStreamError = (error: string) => {
    setStreamError(error);
    setIsStreaming(false);
  };

  const handleCancelStream = () => {
    setIsStreaming(false);
    setStreamPayload(null);
  };

  return (
    <div className="page-container space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor and trigger autonomous CI/CD healing runs
        </p>
      </div>

      <StatsGrid
        totalRuns={stats.totalRuns}
        passedRuns={stats.passedRuns}
        failedRuns={stats.failedRuns}
        totalFixes={stats.totalFixesApplied}
        averageTime={formatDuration(stats.averageTime)}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-6">
          {isStreaming && streamPayload ? (
            <div className="glass-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                  <svg
                    className="h-5 w-5 text-white animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Agent Running
                  </h2>
                  <p className="text-xs text-gray-500">
                    Live progress from the autonomous agent
                  </p>
                </div>
              </div>
              <LiveProgress
                payload={streamPayload}
                onComplete={handleStreamComplete}
                onError={handleStreamError}
                onCancel={handleCancelStream}
              />
            </div>
          ) : (
            <div className="glass-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/20">
                  <svg
                    className="h-5 w-5 text-brand-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Trigger Healing Run
                  </h2>
                  <p className="text-xs text-gray-500">
                    Configure and launch the autonomous agent
                  </p>
                </div>
              </div>
              {streamError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                  {streamError}
                </div>
              )}
              <RunTriggerForm onStartStream={handleStartStream} />
            </div>
          )}

          {result && !isStreaming && (
            <>
              <RunSummary run={result} />
              <ScoreBreakdown run={result} />
              <FixesTable fixes={result.fixes ?? []} />
              <CICDTimeline timeline={result.timeline ?? []} retryLimit={5} />
            </>
          )}

          <div className="glass-card">
            <h2 className="mb-4 text-sm font-semibold text-white uppercase tracking-wider">
              How It Works
            </h2>
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  label: "Clone",
                  desc: "Clones the repository",
                  icon: "📦",
                },
                {
                  step: "2",
                  label: "Test",
                  desc: "Runs tests in Docker sandbox",
                  icon: "🧪",
                },
                {
                  step: "3",
                  label: "Classify",
                  desc: "Identifies bug types via regex",
                  icon: "🔍",
                },
                {
                  step: "4",
                  label: "Fix",
                  desc: "Generates fixes via NVIDIA Qwen",
                  icon: "🤖",
                },
                {
                  step: "5",
                  label: "Push",
                  desc: "Commits and pushes to safe branch",
                  icon: "🚀",
                },
                {
                  step: "6",
                  label: "Monitor",
                  desc: "Verifies CI passes",
                  icon: "👁️",
                },
              ].map(({ step, label, desc, icon }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-sm">
                    {icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent Runs</h2>
            {(isRunning || isStreaming) && (
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-400 border border-brand-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
                Agent active
              </span>
            )}
          </div>
          {runs.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03]">
                <svg
                  className="h-8 w-8 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="mt-4 text-sm text-gray-400">No healing runs yet</p>
              <p className="mt-1 text-xs text-gray-600">
                Enter a repository URL and click Run to start
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {runs.map((run) => (
                <RunCard key={run.id} run={run} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
