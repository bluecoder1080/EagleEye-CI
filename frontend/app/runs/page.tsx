"use client";

import { useAgentStore } from "@/store/useAgentStore";
import { RunCard, LoadingSpinner } from "@/components";
import { StatusBadge } from "@/components/StatusBadge";
import { successRate } from "@/lib/utils";

export default function RunsPage() {
  const { runs, stats, isRunning } = useAgentStore();

  return (
    <div className="page-container space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Healing Runs</h1>
          <p className="mt-1 text-sm text-gray-500">
            {runs.length} total runs &middot;{" "}
            {successRate(stats.passedRuns, stats.totalRuns)} success rate
          </p>
        </div>
        {isRunning && (
          <div className="flex items-center gap-2 text-sm text-brand-400">
            <LoadingSpinner size="sm" />
            Agent running...
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" count={runs.length} active />
        <FilterChip
          label="Passed"
          count={runs.filter((r) => r.status === "PASSED").length}
        />
        <FilterChip
          label="Failed"
          count={runs.filter((r) => r.status === "FAILED").length}
        />
      </div>

      {runs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <svg
            className="h-16 w-16 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p className="mt-4 text-gray-500">No runs recorded</p>
          <p className="mt-1 text-xs text-gray-600">
            Go to Dashboard to trigger a healing run
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active = false,
}: {
  label: string;
  count: number;
  active?: boolean;
}) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-brand-600/20 text-brand-400 border border-brand-500/30"
          : "bg-surface-overlay text-gray-400 border border-transparent hover:border-surface-border"
      }`}
    >
      {label}
      <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px]">
        {count}
      </span>
    </button>
  );
}
