"use client";

import { useParams, useRouter } from "next/navigation";
import { useAgentStore } from "@/store/useAgentStore";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline, FormattedFailureList, FixList } from "@/components";
import { formatDuration, formatDate, extractRepoName } from "@/lib/utils";

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runs = useAgentStore((s) => s.runs);
  const run = runs.find((r) => r.id === params.id);

  if (!run) {
    return (
      <div className="page-container animate-fade-in">
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
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-4 text-gray-400">Run not found</p>
          <button
            onClick={() => router.push("/dashboard/runs")}
            className="btn-secondary mt-4"
          >
            Back to Runs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/runs")}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-surface-overlay hover:text-white"
        >
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-3 text-xl font-bold text-white">
            {extractRepoName(run.repository)}
            <StatusBadge status={run.status} size="md" />
          </h1>
          <p className="mt-0.5 truncate text-sm text-gray-500">
            {run.repository}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Failures" value={run.totalFailures} />
        <MetricCard label="Fixes Applied" value={run.totalFixes} highlight />
        <MetricCard label="Iterations" value={run.iterations} />
        <MetricCard label="Duration" value={formatDuration(run.timeTaken)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoRow label="Branch" value={run.branch} mono />
        <InfoRow label="Team" value={`${run.teamName} / ${run.leaderName}`} />
        <InfoRow label="Created" value={formatDate(run.createdAt)} />
        <InfoRow label="Status" value={run.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="section-title mb-4">Judge Output</h2>
          {run.formattedFailures.length > 0 ? (
            <FormattedFailureList failures={run.formattedFailures} />
          ) : (
            <p className="text-sm text-gray-500">No classified failures</p>
          )}
        </div>

        <div className="card">
          <h2 className="section-title mb-4">
            Fixes ({run.fixes.filter((f) => f.fixApplied).length}/
            {run.fixes.length})
          </h2>
          {run.fixes.length > 0 ? (
            <FixList fixes={run.fixes} />
          ) : (
            <p className="text-sm text-gray-500">No fixes recorded</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title mb-4">
          Timeline ({run.timeline.length} events)
        </h2>
        <Timeline entries={run.timeline} />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="card text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${highlight ? "text-emerald-400" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-raised px-4 py-2.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm text-white ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
