"use client";

import { useState } from "react";
import { useAgentStore } from "@/store/useAgentStore";
import LoadingSpinner from "./LoadingSpinner";

export default function RunTriggerForm() {
  const [repoUrl, setRepoUrl] = useState("");
  const [teamName, setTeamName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [retryLimit, setRetryLimit] = useState(5);
  const { startRun, isRunning, error, clearError } = useAgentStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!repoUrl.trim() || !teamName.trim() || !leaderName.trim() || isRunning)
      return;
    clearError();
    await startRun({
      repoUrl: repoUrl.trim(),
      teamName: teamName.trim(),
      leaderName: leaderName.trim(),
      retryLimit,
    });
  }

  const isValid = repoUrl.trim() && teamName.trim() && leaderName.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label
          htmlFor="repoUrl"
          className="flex items-center gap-2 text-sm font-medium text-gray-300"
        >
          <svg
            className="h-4 w-4 text-brand-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          GitHub Repository URL
        </label>
        <input
          id="repoUrl"
          type="url"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          required
          disabled={isRunning}
          className="glass-input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="teamName"
            className="flex items-center gap-2 text-sm font-medium text-gray-300"
          >
            <svg
              className="h-4 w-4 text-brand-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Team Name
          </label>
          <input
            id="teamName"
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. EAGLEEYE"
            required
            disabled={isRunning}
            className="glass-input"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="leaderName"
            className="flex items-center gap-2 text-sm font-medium text-gray-300"
          >
            <svg
              className="h-4 w-4 text-brand-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Team Leader Name
          </label>
          <input
            id="leaderName"
            type="text"
            value={leaderName}
            onChange={(e) => setLeaderName(e.target.value)}
            placeholder="e.g. JOHN"
            required
            disabled={isRunning}
            className="glass-input"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="retryLimit"
          className="flex items-center gap-2 text-sm font-medium text-gray-300"
        >
          <svg
            className="h-4 w-4 text-brand-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Retry Limit
        </label>
        <input
          id="retryLimit"
          type="number"
          min={1}
          max={20}
          value={retryLimit}
          onChange={(e) =>
            setRetryLimit(
              Math.max(1, Math.min(20, Number(e.target.value) || 1)),
            )
          }
          disabled={isRunning}
          className="glass-input max-w-[120px] tabular-nums"
        />
        <p className="text-xs text-gray-500">Max healing iterations (1–20)</p>
      </div>

      <button
        type="submit"
        disabled={isRunning || !isValid}
        className="neon-btn w-full"
      >
        {isRunning ? (
          <>
            <LoadingSpinner size="sm" className="text-white" />
            <span>Agent Running...</span>
          </>
        ) : (
          <>
            <svg
              className="h-5 w-5"
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
            <span>Run Autonomous Agent</span>
          </>
        )}
      </button>

      {error && (
        <div className="animate-slide-up rounded-xl border border-red-500/20 bg-red-500/[0.07] p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20">
              <svg
                className="h-4 w-4 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-400">Agent Failed</p>
              <p className="mt-1 text-xs leading-relaxed text-red-300/80">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="shrink-0 rounded-lg p-1 text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
