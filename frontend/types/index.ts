export type RunStatus = "PASSED" | "FAILED" | "RUNNING" | "PENDING";

export type BugType =
  | "LINTING"
  | "SYNTAX"
  | "LOGIC"
  | "TYPE_ERROR"
  | "IMPORT"
  | "INDENTATION";

export interface FixRecord {
  file: string;
  line: number;
  bugType: BugType;
  error: string;
  fixApplied: boolean;
}

export interface TimelineEntry {
  timestamp: string;
  event: string;
  detail?: string;
}

export interface AgentRun {
  id: string;
  repository: string;
  teamName: string;
  leaderName: string;
  branch: string;
  totalFailures: number;
  totalFixes: number;
  iterations: number;
  status: RunStatus;
  timeTaken: number;
  fixes: FixRecord[];
  formattedFailures: string[];
  timeline: TimelineEntry[];
  createdAt: string;
  pullRequestUrl?: string;
}

export interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  version: string;
}

export interface RunAgentRequest {
  repoUrl: string;
  teamName: string;
  leaderName: string;
  retryLimit: number;
  dryRun?: boolean;
}

export interface AnalyzeRequest {
  repoUrl: string;
  runTests?: boolean;
}

export interface AnalyzeResponse {
  language: string;
  testCommand: string;
  installCommand: string;
  testOutput?: string;
  testPassed?: boolean;
}

export interface DashboardStats {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  totalFixesApplied: number;
  averageTime: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
