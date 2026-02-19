import type { TimelineEntry } from "@/types";
import { formatDate } from "@/lib/utils";

interface TimelineProps {
  entries: TimelineEntry[];
}

const EVENT_ICONS: Record<string, string> = {
  CLONE: "📦",
  BRANCH_CREATED: "🌿",
  TESTS_RUN: "🧪",
  TESTS_PASSED: "✅",
  TESTS_FAILED: "❌",
  CLASSIFIED_FAILURE: "🔍",
  FIX_GENERATED: "🤖",
  FIX_APPLIED: "🔧",
  COMMITTED: "💾",
  PUSHED: "🚀",
  CI_MONITORING: "👁️",
  CI_PASSED: "🎉",
  CI_FAILED: "⚠️",
  ITERATION_START: "🔄",
  COMPLETED: "🏁",
  ERROR: "💥",
};

export default function Timeline({ entries }: TimelineProps) {
  return (
    <div className="space-y-0">
      {entries.map((entry, idx) => (
        <div key={idx} className="relative flex gap-3 pb-4">
          {idx < entries.length - 1 && (
            <div className="absolute left-[15px] top-8 h-full w-px bg-surface-border" />
          )}

          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-overlay text-sm">
            {EVENT_ICONS[entry.event] || "⚡"}
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-white">
                {entry.event.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(entry.timestamp)}
              </span>
            </div>
            {entry.detail && (
              <p className="mt-0.5 break-all text-xs text-gray-400 font-mono leading-relaxed">
                {entry.detail}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
