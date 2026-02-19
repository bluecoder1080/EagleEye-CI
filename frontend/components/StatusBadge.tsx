import { cn } from "@/lib/utils";
import {
  STATUS_COLORS,
  BUG_TYPE_COLORS,
  BUG_TYPE_LABELS,
} from "@/lib/constants";
import type { RunStatus, BugType } from "@/types";

interface StatusBadgeProps {
  status: RunStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        STATUS_COLORS[status] || STATUS_COLORS.PENDING,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
      )}
    >
      {status === "RUNNING" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {status}
    </span>
  );
}

interface BugTypeBadgeProps {
  bugType: BugType;
}

export function BugTypeBadge({ bugType }: BugTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        BUG_TYPE_COLORS[bugType] ||
          "bg-gray-500/20 text-gray-400 border-gray-500/30",
      )}
    >
      {BUG_TYPE_LABELS[bugType] || bugType}
    </span>
  );
}
