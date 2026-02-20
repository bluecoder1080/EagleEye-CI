"use client";

import { useState, useEffect, useRef } from "react";
import { TimelineEntry, AgentRun, RunAgentRequest } from "@/types";
import { triggerAgentStream } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Play,
  GitBranch,
  TestTube2,
  Search,
  Wrench,
  Upload,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  AlertTriangle,
  Rocket,
  FileCode,
  GitPullRequest,
} from "lucide-react";

interface LiveProgressProps {
  payload: RunAgentRequest;
  onComplete: (result: AgentRun) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

interface StepInfo {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
}

const EVENT_CONFIG: Record<string, StepInfo> = {
  ORCHESTRATOR_START: {
    icon: <Rocket className="w-4 h-4" />,
    label: "Starting Agent",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  CLONE_START: {
    icon: <GitBranch className="w-4 h-4" />,
    label: "Cloning Repository",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  CLONE_DONE: {
    icon: <GitBranch className="w-4 h-4" />,
    label: "Repository Cloned",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  CLONE_FAILED: {
    icon: <XCircle className="w-4 h-4" />,
    label: "Clone Failed",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
  BRANCH_CREATED: {
    icon: <GitBranch className="w-4 h-4" />,
    label: "Branch Created",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  ITERATION_START: {
    icon: <Zap className="w-4 h-4" />,
    label: "Iteration",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  TEST_RUN_START: {
    icon: <TestTube2 className="w-4 h-4" />,
    label: "Running Tests",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
  },
  TESTS_PASSED: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "Tests Passed",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  TESTS_FAILED: {
    icon: <XCircle className="w-4 h-4" />,
    label: "Tests Failed",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
  CLASSIFY_START: {
    icon: <Search className="w-4 h-4" />,
    label: "Classifying Failures",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
  },
  CLASSIFY_DONE: {
    icon: <Search className="w-4 h-4" />,
    label: "Failures Classified",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
  },
  CLASSIFY_REGEX_MISS: {
    icon: <AlertTriangle className="w-4 h-4" />,
    label: "Using LLM Fallback",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  CLASSIFY_NO_FAILURES: {
    icon: <AlertTriangle className="w-4 h-4" />,
    label: "No Failures Found",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  CLASSIFIED_FAILURE: {
    icon: <FileCode className="w-4 h-4" />,
    label: "Failure Detected",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
  FIX_GENERATE_START: {
    icon: <Wrench className="w-4 h-4" />,
    label: "Generating Fix",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  FIX_GENERATE_DONE: {
    icon: <Wrench className="w-4 h-4" />,
    label: "Fix Generated",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  NO_FIXES_GENERATED: {
    icon: <AlertTriangle className="w-4 h-4" />,
    label: "No Fixes Generated",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  PATCH_APPLY_START: {
    icon: <FileCode className="w-4 h-4" />,
    label: "Applying Patch",
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
  },
  PATCH_APPLY_DONE: {
    icon: <FileCode className="w-4 h-4" />,
    label: "Patch Applied",
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
  },
  COMMIT: {
    icon: <GitBranch className="w-4 h-4" />,
    label: "Changes Committed",
    color: "text-sky-400",
    bgColor: "bg-sky-500/20",
  },
  PUSH_ATTEMPT: {
    icon: <Upload className="w-4 h-4" />,
    label: "Attempting Push",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  PUSH: {
    icon: <Upload className="w-4 h-4" />,
    label: "Pushed to Remote",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
  PUSH_FAILED: {
    icon: <XCircle className="w-4 h-4" />,
    label: "Push Failed",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
  CI_MONITOR_START: {
    icon: <Activity className="w-4 h-4" />,
    label: "Monitoring CI",
    color: "text-sky-400",
    bgColor: "bg-sky-500/20",
  },
  CI_PASSED: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "CI Passed",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  CI_FAILED: {
    icon: <XCircle className="w-4 h-4" />,
    label: "CI Failed",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
  PR_CREATE_START: {
    icon: <GitPullRequest className="w-4 h-4" />,
    label: "Creating Pull Request",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  PR_CREATED: {
    icon: <GitPullRequest className="w-4 h-4" />,
    label: "Pull Request Created",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  PR_CREATE_FAILED: {
    icon: <GitPullRequest className="w-4 h-4" />,
    label: "PR Creation Failed",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
  ORCHESTRATOR_DONE: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "Agent Complete",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
};

const DEFAULT_STEP: StepInfo = {
  icon: <Activity className="w-4 h-4" />,
  label: "Processing",
  color: "text-slate-400",
  bgColor: "bg-slate-500/20",
};

export default function LiveProgress({
  payload,
  onComplete,
  onError,
  onCancel,
}: LiveProgressProps) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [currentStep, setCurrentStep] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const runAgent = async () => {
      try {
        await triggerAgentStream(payload, {
          onProgress: (entry) => {
            if (cancelled) return;
            setTimeline((prev) => [...prev, entry]);
            setCurrentStep(entry.event);
          },
          onResult: (result) => {
            if (cancelled) return;
            onComplete(result);
          },
          onError: (error) => {
            if (cancelled) return;
            onError(error);
            setIsRunning(false);
          },
          onDone: () => {
            if (cancelled) return;
            setIsRunning(false);
          },
        });
      } catch (err) {
        if (cancelled) return;
        onError(err instanceof Error ? err.message : "Unknown error");
        setIsRunning(false);
      }
    };

    runAgent();

    return () => {
      cancelled = true;
    };
  }, [payload, onComplete, onError]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [timeline]);

  const getStepInfo = (event: string): StepInfo => {
    return EVENT_CONFIG[event] || DEFAULT_STEP;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const currentInfo = getStepInfo(currentStep);

  return (
    <div className="space-y-6">
      {/* Current Step Indicator */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isRunning ? (
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center animate-pulse">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
                <div className="absolute -inset-1 bg-cyan-500/20 rounded-xl blur animate-pulse" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isRunning ? "Agent Running" : "Agent Complete"}
              </h3>
              <p className={cn("text-sm", currentInfo.color)}>
                {currentInfo.label}
                {timeline.length > 0 &&
                  timeline[timeline.length - 1].detail &&
                  ` • ${timeline[timeline.length - 1].detail}`}
              </p>
            </div>
          </div>
          {isRunning && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors border border-red-500/30"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 ease-out",
              isRunning
                ? "bg-gradient-to-r from-cyan-500 via-blue-500 to-teal-500 animate-pulse"
                : "bg-green-500",
            )}
            style={{
              width: isRunning
                ? `${Math.min(timeline.length * 8, 95)}%`
                : "100%",
            }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div
        ref={scrollRef}
        className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden max-h-[400px] overflow-y-auto"
      >
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Live Timeline
          </h3>
        </div>
        <div className="divide-y divide-slate-700/30">
          {timeline.map((entry, index) => {
            const info = getStepInfo(entry.event);
            const isLatest = index === timeline.length - 1;
            return (
              <div
                key={index}
                className={cn(
                  "p-4 flex items-start gap-3 transition-all duration-300",
                  isLatest && isRunning && "bg-slate-700/30",
                )}
                style={{
                  animation: isLatest ? "slideIn 0.3s ease-out" : undefined,
                }}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    info.bgColor,
                    info.color,
                  )}
                >
                  {info.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium", info.color)}>
                      {info.label}
                    </span>
                    {isLatest && isRunning && (
                      <span className="flex items-center gap-1 text-xs text-blue-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        Active
                      </span>
                    )}
                  </div>
                  {entry.detail && (
                    <p className="text-sm text-slate-400 truncate mt-0.5">
                      {entry.detail}
                    </p>
                  )}
                </div>
                <span className="text-xs text-slate-500 font-mono shrink-0">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
            );
          })}
          {timeline.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Waiting for events...</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
