export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const ENDPOINTS = {
  health: `${API_URL}/health`,
  runAgent: `${API_URL}/api/run-agent`,
  analyze: `${API_URL}/api/analyze`,
} as const;

export const APP_NAME = "EagleEye CI";
export const APP_DESCRIPTION = "Autonomous CI/CD Healing Agent";

export const BUG_TYPE_LABELS: Record<string, string> = {
  LINTING: "Lint Error",
  SYNTAX: "Syntax Error",
  LOGIC: "Logic Error",
  TYPE_ERROR: "Type Error",
  IMPORT: "Import Error",
  INDENTATION: "Indentation Error",
};

export const BUG_TYPE_COLORS: Record<string, string> = {
  LINTING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  SYNTAX: "bg-red-500/20 text-red-400 border-red-500/30",
  LOGIC: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  TYPE_ERROR: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  IMPORT: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  INDENTATION: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export const STATUS_COLORS: Record<string, string> = {
  PASSED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
  RUNNING: "bg-brand-500/20 text-brand-400 border-brand-500/30",
  PENDING: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};
