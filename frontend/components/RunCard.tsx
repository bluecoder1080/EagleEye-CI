"use client";

import Link from "next/link";
import type { AgentRun } from "@/types";
import { StatusBadge } from "./StatusBadge";
import {
  formatDuration,
  formatRelativeTime,
  extractRepoName,
} from "@/lib/utils";

interface RunCardProps {
  run: AgentRun;
}

export default function RunCard({ run }: RunCardProps) {
  return (
    <Link
      href={`/runs/${run.id}`}
      className="group block rounded-xl border border-surface-border bg-surface-raised p-4 transition-all hover:border-brand-600/40 hover:bg-surface-overlay"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">
            {extractRepoName(run.repository)}
          </h3>
          <p className="mt-1 truncate text-xs text-gray-500">
            {run.repository}
          </p>
        </div>
        <StatusBadge status={run.status} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-500">Failures</p>
          <p className="mt-0.5 text-sm font-semibold text-white">
            {run.totalFailures}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Fixes</p>
          <p className="mt-0.5 text-sm font-semibold text-emerald-400">
            {run.totalFixes}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Iterations</p>
          <p className="mt-0.5 text-sm font-semibold text-white">
            {run.iterations}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-surface-border pt-3">
        <span className="text-xs text-gray-500">
          {formatDuration(run.timeTaken)}
        </span>
        <span className="text-xs text-gray-500">
          {formatRelativeTime(run.createdAt)}
        </span>
      </div>
    </Link>
  );
}
