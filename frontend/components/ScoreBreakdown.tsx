"use client";

import { useEffect, useState } from "react";
import type { AgentRun } from "@/types";

interface ScoreBreakdownProps {
  run: AgentRun;
}

interface ScoreLine {
  label: string;
  delta: number;
  detail: string;
}

function computeScore(run: AgentRun): {
  finalScore: number;
  lines: ScoreLine[];
} {
  const lines: ScoreLine[] = [];
  let score = 100;

  lines.push({ label: "Base Score", delta: 100, detail: "Starting score" });

  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  if (run.timeTaken < FIVE_MINUTES_MS) {
    score += 10;
    lines.push({
      label: "Speed Bonus",
      delta: 10,
      detail: `Completed in under 5 minutes`,
    });
  }

  const commitCount = (run.timeline ?? []).filter(
    (t) => t.event === "COMMITTED",
  ).length;
  if (commitCount > 20) {
    const penalty = (commitCount - 20) * 2;
    score -= penalty;
    lines.push({
      label: "Commit Penalty",
      delta: -penalty,
      detail: `${commitCount} commits (${commitCount - 20} over limit of 20)`,
    });
  }

  const finalScore = Math.max(0, Math.min(120, score));
  return { finalScore, lines };
}

export default function ScoreBreakdown({ run }: ScoreBreakdownProps) {
  const { finalScore, lines } = computeScore(run);
  const maxScore = 120;
  const percentage = Math.round((finalScore / maxScore) * 100);

  const [animatedWidth, setAnimatedWidth] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const widthTimer = setTimeout(() => setAnimatedWidth(percentage), 100);
    const duration = 1200;
    const steps = 40;
    const increment = finalScore / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= finalScore) {
        setAnimatedScore(finalScore);
        clearInterval(interval);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);

    return () => {
      clearTimeout(widthTimer);
      clearInterval(interval);
    };
  }, [finalScore, percentage]);

  const scoreColor =
    finalScore >= 100
      ? "text-emerald-400"
      : finalScore >= 80
        ? "text-yellow-400"
        : "text-red-400";

  const barColor =
    finalScore >= 100
      ? "from-emerald-500 to-emerald-400"
      : finalScore >= 80
        ? "from-yellow-500 to-yellow-400"
        : "from-red-500 to-red-400";

  const glowColor =
    finalScore >= 100
      ? "rgba(16,185,129,0.3)"
      : finalScore >= 80
        ? "rgba(234,179,8,0.3)"
        : "rgba(239,68,68,0.3)";

  return (
    <div className="glass-card animate-slide-up space-y-6">
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
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Score Breakdown</h2>
          <p className="text-xs text-gray-500">Judge evaluation scoring</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 py-2">
        <div className="relative">
          <span
            className={`text-6xl font-bold tabular-nums tracking-tight ${scoreColor}`}
            style={{ textShadow: `0 0 40px ${glowColor}` }}
          >
            {animatedScore}
          </span>
          <span className="ml-1 text-lg font-medium text-gray-500">
            / {maxScore}
          </span>
        </div>

        <div className="w-full space-y-2">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/[0.04]">
            <div
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000 ease-out`}
              style={{
                width: `${animatedWidth}%`,
                boxShadow: `0 0 12px ${glowColor}, 0 0 4px ${glowColor}`,
              }}
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.08] to-transparent" />
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 tabular-nums">
            <span>0</span>
            <span>40</span>
            <span>80</span>
            <span>120</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Breakdown
        </h3>
        {lines.map((line, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{line.label}</p>
              <p className="text-xs text-gray-500 truncate">{line.detail}</p>
            </div>
            <span
              className={`ml-3 text-sm font-bold tabular-nums ${
                line.delta > 0
                  ? "text-emerald-400"
                  : line.delta < 0
                    ? "text-red-400"
                    : "text-gray-400"
              }`}
            >
              {line.delta > 0 ? "+" : ""}
              {line.delta}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Scoring Rules
        </h3>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-gray-600 flex-shrink-0" />
            Base score: 100 points
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-emerald-500 flex-shrink-0" />
            +10 points if completed in under 5 minutes
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-red-500 flex-shrink-0" />
            −2 points per commit over 20
          </li>
        </ul>
      </div>
    </div>
  );
}
