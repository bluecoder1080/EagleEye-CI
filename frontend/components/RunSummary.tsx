"use client";

import type { AgentRun } from "@/types";
import { formatDuration } from "@/lib/utils";

interface RunSummaryProps {
  run: AgentRun;
}

export default function RunSummary({ run }: RunSummaryProps) {
  const isPassed = run.status === "PASSED";

  return (
    <div className="glass-card animate-slide-up space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
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
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white">Run Summary</h2>
        </div>

        <span
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${
            isPassed
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
              : "bg-red-500/15 text-red-400 border border-red-500/25"
          }`}
          style={{
            boxShadow: isPassed
              ? "0 0 20px rgba(16,185,129,0.15), 0 0 60px rgba(16,185,129,0.05)"
              : "0 0 20px rgba(239,68,68,0.15), 0 0 60px rgba(239,68,68,0.05)",
          }}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isPassed
                ? "bg-emerald-400 animate-pulse-slow"
                : "bg-red-400 animate-pulse-slow"
            }`}
          />
          {run.status}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryField
          icon={
            <svg
              className="h-4 w-4"
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
          }
          label="Repository URL"
          value={run.repository}
          mono
          full
        />
        <SummaryField
          icon={
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
          label="Team Name"
          value={run.teamName}
        />
        <SummaryField
          icon={
            <svg
              className="h-4 w-4"
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
          }
          label="Leader Name"
          value={run.leaderName}
        />
        <SummaryField
          icon={
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          }
          label="Branch Name"
          value={run.branch}
          mono
          full
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile
          label="Total Failures"
          value={run.totalFailures}
          color="red"
        />
        <MetricTile label="Total Fixes" value={run.totalFixes} color="green" />
        <MetricTile label="Iterations" value={run.iterations} color="blue" />
        <MetricTile
          label="Time Taken"
          value={formatDuration(run.timeTaken)}
          color="purple"
        />
      </div>
    </div>
  );
}

function SummaryField({
  icon,
  label,
  value,
  mono = false,
  full = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div
      className={`rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 ${full ? "sm:col-span-2" : ""}`}
    >
      <div className="flex items-center gap-2 text-gray-500 mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        className={`text-sm text-white truncate ${mono ? "font-mono text-xs" : "font-medium"}`}
      >
        {value}
      </p>
    </div>
  );
}

function MetricTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "red" | "green" | "blue" | "purple";
}) {
  const colorMap = {
    red: "from-red-500/10 to-red-500/[0.02] text-red-400",
    green: "from-emerald-500/10 to-emerald-500/[0.02] text-emerald-400",
    blue: "from-brand-500/10 to-brand-500/[0.02] text-brand-400",
    purple: "from-purple-500/10 to-purple-500/[0.02] text-purple-400",
  };

  return (
    <div className="rounded-xl border border-white/[0.04] bg-gradient-to-br p-3 text-center">
      <div className={`bg-gradient-to-br ${colorMap[color]} rounded-lg p-3`}>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </div>
      <p className="mt-2 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}
