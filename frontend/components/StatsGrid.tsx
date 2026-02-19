import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color?: "default" | "green" | "red" | "blue";
  icon?: React.ReactNode;
}

function StatCard({
  label,
  value,
  subtext,
  color = "default",
  icon,
}: StatCardProps) {
  const colorMap = {
    default: "border-surface-border",
    green: "border-emerald-500/30",
    red: "border-red-500/30",
    blue: "border-brand-500/30",
  };

  const valueColorMap = {
    default: "text-white",
    green: "text-emerald-400",
    red: "text-red-400",
    blue: "text-brand-400",
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface-raised p-4 transition-colors hover:bg-surface-overlay",
        colorMap[color],
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>
      <p className={cn("mt-2 text-2xl font-bold", valueColorMap[color])}>
        {value}
      </p>
      {subtext && <p className="mt-1 text-xs text-gray-500">{subtext}</p>}
    </div>
  );
}

interface StatsGridProps {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  totalFixes: number;
  averageTime: string;
}

export default function StatsGrid({
  totalRuns,
  passedRuns,
  failedRuns,
  totalFixes,
  averageTime,
}: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="Total Runs"
        value={totalRuns}
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        }
      />
      <StatCard
        label="Passed"
        value={passedRuns}
        color="green"
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />
      <StatCard
        label="Failed"
        value={failedRuns}
        color="red"
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
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />
      <StatCard
        label="Fixes Applied"
        value={totalFixes}
        color="blue"
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
              d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
            />
          </svg>
        }
      />
      <StatCard label="Avg Time" value={averageTime} subtext="per run" />
    </div>
  );
}
