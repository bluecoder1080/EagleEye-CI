import { GitHubService, WorkflowRun, WorkflowLog } from "../services";
import { ShellService, ShellResult } from "../services";
import { GitService } from "../services";
import { createLogger, config, withRetry } from "../utils";

const logger = createLogger("HealingAgent");

export interface DiagnosisResult {
  runId: number;
  failureCategory: FailureCategory;
  summary: string;
  suggestedFix: string;
  rawLogs: string;
}

export interface HealingResult {
  success: boolean;
  runId: number;
  diagnosis: DiagnosisResult;
  actionsPerformed: string[];
  retryCount: number;
  error?: string;
}

export enum FailureCategory {
  BUILD_ERROR = "BUILD_ERROR",
  TEST_FAILURE = "TEST_FAILURE",
  DEPENDENCY_ISSUE = "DEPENDENCY_ISSUE",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  INFRASTRUCTURE_ERROR = "INFRASTRUCTURE_ERROR",
  TIMEOUT = "TIMEOUT",
  UNKNOWN = "UNKNOWN",
}

const FAILURE_PATTERNS: Array<{ pattern: RegExp; category: FailureCategory }> =
  [
    {
      pattern: /npm ERR!|yarn error|pnpm ERR/i,
      category: FailureCategory.DEPENDENCY_ISSUE,
    },
    {
      pattern: /ENOENT|MODULE_NOT_FOUND|Cannot find module/i,
      category: FailureCategory.DEPENDENCY_ISSUE,
    },
    {
      pattern: /tsc.*error TS|SyntaxError|compilation failed/i,
      category: FailureCategory.BUILD_ERROR,
    },
    {
      pattern: /build failed|Build error/i,
      category: FailureCategory.BUILD_ERROR,
    },
    {
      pattern: /FAIL.*test|test.*failed|AssertionError|expect\(/i,
      category: FailureCategory.TEST_FAILURE,
    },
    {
      pattern: /jest.*failed|mocha.*failing/i,
      category: FailureCategory.TEST_FAILURE,
    },
    {
      pattern: /ENOMEM|disk space|quota exceeded/i,
      category: FailureCategory.INFRASTRUCTURE_ERROR,
    },
    {
      pattern: /timeout|timed out|ETIMEDOUT/i,
      category: FailureCategory.TIMEOUT,
    },
    {
      pattern: /invalid.*config|missing.*env|environment variable/i,
      category: FailureCategory.CONFIGURATION_ERROR,
    },
  ];

export class HealingAgent {
  private github: GitHubService;
  private shell: ShellService;
  private git: GitService;

  constructor() {
    this.github = new GitHubService();
    this.shell = new ShellService();
    this.git = new GitService();
  }

  async diagnose(run: WorkflowRun): Promise<DiagnosisResult> {
    logger.info(`Diagnosing failure for run ${run.id} ("${run.name}")`);

    const logData = await this.github.getWorkflowLogs(run.id);
    const category = this.categorizeFailure(logData.logs);
    const summary = this.buildSummary(run, category, logData.logs);
    const suggestedFix = this.suggestFix(category, logData.logs);

    const diagnosis: DiagnosisResult = {
      runId: run.id,
      failureCategory: category,
      summary,
      suggestedFix,
      rawLogs: logData.logs.slice(0, 5000),
    };

    logger.info(`Diagnosis complete: ${category}`, { runId: run.id, summary });
    return diagnosis;
  }

  async heal(diagnosis: DiagnosisResult): Promise<HealingResult> {
    const actions: string[] = [];
    let retryCount = 0;

    logger.info(
      `Attempting to heal run ${diagnosis.runId} (${diagnosis.failureCategory})`,
    );

    try {
      const result = await withRetry(
        async () => {
          retryCount++;
          return this.applyFix(diagnosis, actions);
        },
        `heal-run-${diagnosis.runId}`,
        config.retryLimit,
      );

      return {
        success: result,
        runId: diagnosis.runId,
        diagnosis,
        actionsPerformed: actions,
        retryCount,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Healing failed for run ${diagnosis.runId}: ${errorMsg}`);

      return {
        success: false,
        runId: diagnosis.runId,
        diagnosis,
        actionsPerformed: actions,
        retryCount,
        error: errorMsg,
      };
    }
  }

  private async applyFix(
    diagnosis: DiagnosisResult,
    actions: string[],
  ): Promise<boolean> {
    switch (diagnosis.failureCategory) {
      case FailureCategory.DEPENDENCY_ISSUE:
        return this.fixDependencyIssue(diagnosis, actions);

      case FailureCategory.BUILD_ERROR:
        return this.fixBuildError(diagnosis, actions);

      case FailureCategory.TEST_FAILURE:
        return this.fixTestFailure(diagnosis, actions);

      case FailureCategory.TIMEOUT:
      case FailureCategory.INFRASTRUCTURE_ERROR:
        return this.rerunWorkflow(diagnosis, actions);

      case FailureCategory.CONFIGURATION_ERROR:
        return this.reportConfigurationError(diagnosis, actions);

      default:
        return this.reportUnknownError(diagnosis, actions);
    }
  }

  private async fixDependencyIssue(
    diagnosis: DiagnosisResult,
    actions: string[],
  ): Promise<boolean> {
    logger.info("Applying dependency fix: re-running workflow");
    actions.push("Identified dependency issue from CI logs");
    actions.push("Re-running workflow to attempt fresh install");

    await this.github.rerunWorkflow(diagnosis.runId);
    actions.push(`Re-triggered workflow run ${diagnosis.runId}`);
    return true;
  }

  private async fixBuildError(
    diagnosis: DiagnosisResult,
    actions: string[],
  ): Promise<boolean> {
    actions.push("Identified build error from CI logs");
    actions.push("Creating issue for manual review");

    const issueNumber = await this.github.createIssue(
      `[CI/CD Agent] Build failure in run #${diagnosis.runId}`,
      this.formatIssueBody(diagnosis),
    );
    actions.push(`Created issue #${issueNumber}`);
    return true;
  }

  private async fixTestFailure(
    diagnosis: DiagnosisResult,
    actions: string[],
  ): Promise<boolean> {
    actions.push("Identified test failure from CI logs");
    actions.push("Creating issue with test failure details");

    const issueNumber = await this.github.createIssue(
      `[CI/CD Agent] Test failure in run #${diagnosis.runId}`,
      this.formatIssueBody(diagnosis),
    );
    actions.push(`Created issue #${issueNumber}`);
    return true;
  }

  private async rerunWorkflow(
    diagnosis: DiagnosisResult,
    actions: string[],
  ): Promise<boolean> {
    actions.push(
      `Identified ${diagnosis.failureCategory}: re-running workflow`,
    );
    await this.github.rerunWorkflow(diagnosis.runId);
    actions.push(`Re-triggered workflow run ${diagnosis.runId}`);
    return true;
  }

  private async reportConfigurationError(
    diagnosis: DiagnosisResult,
    actions: string[],
  ): Promise<boolean> {
    actions.push("Identified configuration error");
    const issueNumber = await this.github.createIssue(
      `[CI/CD Agent] Configuration error in run #${diagnosis.runId}`,
      this.formatIssueBody(diagnosis),
    );
    actions.push(`Created issue #${issueNumber} for configuration review`);
    return true;
  }

  private async reportUnknownError(
    diagnosis: DiagnosisResult,
    actions: string[],
  ): Promise<boolean> {
    actions.push("Could not auto-categorize failure");
    const issueNumber = await this.github.createIssue(
      `[CI/CD Agent] Undiagnosed failure in run #${diagnosis.runId}`,
      this.formatIssueBody(diagnosis),
    );
    actions.push(`Created issue #${issueNumber} for manual investigation`);
    return true;
  }

  private categorizeFailure(logs: string): FailureCategory {
    for (const { pattern, category } of FAILURE_PATTERNS) {
      if (pattern.test(logs)) {
        return category;
      }
    }
    return FailureCategory.UNKNOWN;
  }

  private buildSummary(
    run: WorkflowRun,
    category: FailureCategory,
    logs: string,
  ): string {
    const truncatedLogs = logs.slice(0, 500);
    return [
      `Workflow: ${run.name ?? "unknown"}`,
      `Run ID: ${run.id}`,
      `Category: ${category}`,
      `Created: ${run.created_at}`,
      `Log excerpt: ${truncatedLogs}`,
    ].join("\n");
  }

  private suggestFix(category: FailureCategory, _logs: string): string {
    const suggestions: Record<FailureCategory, string> = {
      [FailureCategory.BUILD_ERROR]:
        "Review TypeScript/build errors in the logs. Check for syntax errors or missing type definitions.",
      [FailureCategory.TEST_FAILURE]:
        "Review failing test assertions. Check if test fixtures or mocks need updating.",
      [FailureCategory.DEPENDENCY_ISSUE]:
        "Clear node_modules and lock file, then reinstall. Check for conflicting peer dependencies.",
      [FailureCategory.CONFIGURATION_ERROR]:
        "Verify environment variables and configuration files are set correctly.",
      [FailureCategory.INFRASTRUCTURE_ERROR]:
        "Infrastructure issue detected. Re-run the workflow or check runner health.",
      [FailureCategory.TIMEOUT]:
        "Workflow timed out. Consider increasing timeout limits or optimizing long-running steps.",
      [FailureCategory.UNKNOWN]:
        "Unable to auto-diagnose. Manual investigation required.",
    };
    return suggestions[category];
  }

  private formatIssueBody(diagnosis: DiagnosisResult): string {
    return [
      "## CI/CD Healing Agent Report",
      "",
      `**Run ID:** ${diagnosis.runId}`,
      `**Category:** ${diagnosis.failureCategory}`,
      `**Suggested Fix:** ${diagnosis.suggestedFix}`,
      "",
      "### Summary",
      diagnosis.summary,
      "",
      "### Log Excerpt",
      "```",
      diagnosis.rawLogs.slice(0, 3000),
      "```",
      "",
      "_This issue was automatically created by the Autonomous CI/CD Healing Agent._",
    ].join("\n");
  }
}
