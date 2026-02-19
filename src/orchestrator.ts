import fs from "fs";
import path from "path";
import simpleGit from "simple-git";
import { GitHubService } from "./services";
import { DockerService, DockerTestResult } from "./services";
import {
  RepoAnalyzerAgent,
  RepoAnalysis,
  FailureClassifierAgent,
  ClassifiedFailure,
  FixGeneratorAgent,
  GeneratedFix,
} from "./agents";
import { createLogger, config, formatAllFailuresForJudge } from "./utils";

const logger = createLogger("Orchestrator");

// ── Public types ──────────────────────────────────────────────

export type ProgressCallback = (entry: TimelineEntry) => void;

export interface OrchestratorOptions {
  repoUrl: string;
  teamName?: string;
  leaderName?: string;
  retryLimit?: number;
  dryRun?: boolean;
  onProgress?: ProgressCallback;
}

export interface FixRecord {
  file: string;
  line: number;
  bugType: string;
  error: string;
  fixApplied: boolean;
}

export interface TimelineEntry {
  timestamp: string;
  event: string;
  detail?: string;
}

export interface OrchestratorResult {
  repository: string;
  teamName: string;
  leaderName: string;
  branch: string;
  totalFailures: number;
  totalFixes: number;
  iterations: number;
  status: "PASSED" | "FAILED";
  timeTaken: number;
  fixes: FixRecord[];
  timeline: TimelineEntry[];
  formattedFailures: string[];
}

// ── Orchestrator ──────────────────────────────────────────────

export class Orchestrator {
  private analyzer: RepoAnalyzerAgent;
  private classifier: FailureClassifierAgent;
  private fixer: FixGeneratorAgent;
  private docker: DockerService;
  private github: GitHubService;
  private currentProgress?: ProgressCallback;

  constructor() {
    this.analyzer = new RepoAnalyzerAgent();
    this.classifier = new FailureClassifierAgent();
    this.fixer = new FixGeneratorAgent({
      apiUrl: config.nvidia.apiUrl,
      apiKey: config.nvidia.apiKey,
    });
    this.docker = new DockerService();
    this.github = new GitHubService();

    // Build custom Docker images at startup (non-blocking, best-effort)
    this.docker.buildCustomImages().catch((err) => {
      logger.warn(`Failed to build custom Docker images: ${err}`);
    });
  }

  async run(options: OrchestratorOptions): Promise<OrchestratorResult> {
    // Store progress callback for this run
    this.currentProgress = options.onProgress;

    const startTime = Date.now();
    const timeline: TimelineEntry[] = [];
    const allFixes: FixRecord[] = [];

    const teamName = options.teamName || config.teamName;
    const leaderName = options.leaderName || config.leaderName;
    const retryLimit = options.retryLimit || config.retryLimit;
    const branchName = this.buildBranchName(teamName, leaderName);

    this.addTimeline(timeline, "ORCHESTRATOR_START", `repo=${options.repoUrl}`);
    logger.info(`Orchestrator starting for ${options.repoUrl}`);
    logger.info(`Branch: ${branchName} | Retry limit: ${retryLimit}`);

    // ── Step 1: Clone & analyse ──────────────────────────────
    this.addTimeline(timeline, "CLONE_START");
    let analysis: RepoAnalysis;
    try {
      analysis = await this.analyzer.analyze(options.repoUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.addTimeline(timeline, "CLONE_FAILED", msg);
      return this.buildResult({
        repoUrl: options.repoUrl,
        teamName,
        leaderName,
        branchName,
        status: "FAILED",
        startTime,
        timeline,
        allFixes,
        iterations: 0,
      });
    }
    this.addTimeline(timeline, "CLONE_DONE", `lang=${analysis.language}`);

    // Create the fix branch (never push to main)
    const repoPath = analysis.localPath;
    await this.prepareBranch(repoPath, branchName);
    this.addTimeline(timeline, "BRANCH_CREATED", branchName);

    // ── Step 2–4: Retry loop ─────────────────────────────────
    let iteration = 0;
    let passed = false;

    while (iteration < retryLimit) {
      iteration++;
      this.addTimeline(timeline, "ITERATION_START", `#${iteration}`);
      logger.info(`──── Iteration ${iteration}/${retryLimit} ────`);

      // 2a. Run tests in Docker sandbox
      this.addTimeline(timeline, "TEST_RUN_START", `iteration=${iteration}`);
      const testResult = await this.runTestsSafe(analysis);

      if (testResult.passed) {
        this.addTimeline(timeline, "TESTS_PASSED", `iteration=${iteration}`);
        passed = true;
        break;
      }

      this.addTimeline(timeline, "TESTS_FAILED", `iteration=${iteration}`);
      logger.info(`Tests failed on iteration ${iteration}`);

      // 2b. Classify failures
      this.addTimeline(timeline, "CLASSIFY_START");
      const failures = this.classifier.classify(testResult.output);

      if (failures.length === 0) {
        this.addTimeline(
          timeline,
          "CLASSIFY_REGEX_MISS",
          "Regex classifier found 0 failures — falling back to LLM analysis",
        );
        logger.warn(
          "Regex classifier found 0 structured failures — using LLM fallback with raw output",
        );

        // Fallback: read all source files and let the LLM classify + fix
        const sourceFiles = this.readAllSourceFiles(
          repoPath,
          analysis.language,
        );
        if (sourceFiles.size > 0) {
          this.addTimeline(timeline, "FIX_GENERATE_START", "llm-fallback");
          const llmFixes = await this.fixer.generateFixesFromRawOutput(
            testResult.output,
            sourceFiles,
            analysis.language,
          );
          this.addTimeline(
            timeline,
            "FIX_GENERATE_DONE",
            `generated=${llmFixes.length}`,
          );

          if (llmFixes.length > 0) {
            this.addTimeline(timeline, "PATCH_APPLY_START");
            const applied = this.applyFixes(repoPath, llmFixes, allFixes);
            this.addTimeline(
              timeline,
              "PATCH_APPLY_DONE",
              `applied=${applied}`,
            );

            if (applied > 0) {
              const commitMsg = this.buildCommitMessage(llmFixes);
              await this.commitChanges(repoPath, commitMsg, branchName);
              this.addTimeline(timeline, "COMMIT", commitMsg);

              if (!options.dryRun) {
                await this.pushBranch(repoPath, branchName, options.repoUrl);
                this.addTimeline(timeline, "PUSH", branchName);
              }
              continue; // try again with the fix applied
            }
          }
        }

        this.addTimeline(
          timeline,
          "CLASSIFY_NO_FAILURES",
          "Could not generate fixes from raw output either",
        );
        break;
      }
      this.addTimeline(timeline, "CLASSIFY_DONE", `found=${failures.length}`);
      logger.info(`Classified ${failures.length} failure(s)`);

      // Log judge-formatted output
      const formatted = formatAllFailuresForJudge(failures);
      for (const line of formatted) {
        logger.info(`[JUDGE] ${line}`);
        this.addTimeline(timeline, "CLASSIFIED_FAILURE", line);
      }

      // 2c. Read file contents for each failing file
      const fileContents = this.readFailingFiles(repoPath, failures);

      // 2d. Generate fixes via NVIDIA Qwen
      this.addTimeline(timeline, "FIX_GENERATE_START");
      const fixes = await this.fixer.generateFixes(failures, fileContents);
      this.addTimeline(
        timeline,
        "FIX_GENERATE_DONE",
        `generated=${fixes.length}`,
      );

      if (fixes.length === 0) {
        logger.warn("FixGenerator returned 0 fixes — stopping");
        this.addTimeline(timeline, "NO_FIXES_GENERATED");
        break;
      }

      // 2e. Apply patches
      this.addTimeline(timeline, "PATCH_APPLY_START");
      const applied = this.applyFixes(repoPath, fixes, allFixes);
      this.addTimeline(timeline, "PATCH_APPLY_DONE", `applied=${applied}`);

      if (applied === 0) {
        logger.warn("No patches were applied — stopping");
        break;
      }

      // 2f. Commit
      const commitMsg = this.buildCommitMessage(fixes);
      await this.commitChanges(repoPath, commitMsg, branchName);
      this.addTimeline(timeline, "COMMIT", commitMsg);

      // 2g. Push (unless dry-run)
      if (!options.dryRun) {
        await this.pushBranch(repoPath, branchName, options.repoUrl);
        this.addTimeline(timeline, "PUSH", branchName);

        // 2h. Wait for CI and check result
        this.addTimeline(timeline, "CI_MONITOR_START");
        const ciPassed = await this.monitorCI(branchName);
        this.addTimeline(timeline, ciPassed ? "CI_PASSED" : "CI_FAILED");

        if (ciPassed) {
          passed = true;
          break;
        }
      }
    }

    const status = passed ? "PASSED" : "FAILED";
    this.addTimeline(timeline, "ORCHESTRATOR_DONE", status);

    // ── Write results.json ───────────────────────────────────
    const result = this.buildResult({
      repoUrl: options.repoUrl,
      teamName,
      leaderName,
      branchName,
      status,
      startTime,
      timeline,
      allFixes,
      iterations: iteration,
    });

    this.writeResultsJson(result);
    logger.info(`Finished: ${status} after ${iteration} iteration(s)`);

    // Cleanup clone
    try {
      this.analyzer.cleanup(repoPath);
    } catch {
      /* best-effort */
    }

    // Clear progress callback
    this.currentProgress = undefined;

    return result;
  }

  // ── Branch helpers ─────────────────────────────────────────

  private buildBranchName(teamName: string, leaderName: string): string {
    const sanitize = (s: string) =>
      s
        .toUpperCase()
        .replace(/[^A-Z\s]/g, "") // strip numbers + special chars, keep spaces
        .trim()
        .replace(/\s+/g, "_") // spaces → single underscore
        .replace(/_+/g, "_") // collapse multiple underscores
        .replace(/^_|_$/g, ""); // trim leading/trailing underscores

    const team = sanitize(teamName);
    const leader = sanitize(leaderName);

    if (!team || !leader) {
      throw new Error(
        `Invalid branch naming inputs: teamName="${teamName}", leaderName="${leaderName}"`,
      );
    }

    return `${team}_${leader}_AI_Fix`;
  }

  private async prepareBranch(
    repoPath: string,
    branchName: string,
  ): Promise<void> {
    const git = simpleGit(repoPath);

    try {
      await git.checkout(branchName);
      logger.info(`Checked out existing branch: ${branchName}`);
    } catch {
      await git.checkoutLocalBranch(branchName);
      logger.info(`Created new branch: ${branchName}`);
    }
  }

  // ── Test runner ────────────────────────────────────────────

  private async runTestsSafe(
    analysis: RepoAnalysis,
  ): Promise<DockerTestResult> {
    const dockerAvailable = await this.docker.isDockerAvailable();

    if (dockerAvailable) {
      return this.docker.runTests(
        analysis.localPath,
        analysis.language,
        analysis.installCommand,
        analysis.testCommand,
      );
    }

    // Fallback: run directly via shell (Railway may use Docker-in-Docker)
    logger.warn("Docker not available — running tests directly via shell");
    const { ShellService } = await import("./services");
    const shell = new ShellService();

    const startTime = Date.now();
    const installResult = await shell.run(
      analysis.installCommand,
      analysis.localPath,
    );
    const testResult = await shell.run(
      analysis.testCommand,
      analysis.localPath,
    );
    const executionTime = Date.now() - startTime;

    const output = [
      installResult.stdout,
      installResult.stderr,
      testResult.stdout,
      testResult.stderr,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      passed: testResult.exitCode === 0,
      output,
      executionTime,
      containerId: "host",
    };
  }

  // ── File I/O ───────────────────────────────────────────────

  private readAllSourceFiles(
    repoPath: string,
    language: string,
  ): Map<string, string> {
    const contents = new Map<string, string>();
    const extensions =
      language === "python"
        ? [".py"]
        : language === "node"
          ? [".js", ".ts", ".mjs", ".cjs", ".jsx", ".tsx"]
          : [".py", ".js", ".ts"];

    try {
      const files = fs.readdirSync(repoPath, { recursive: true });
      for (const f of files) {
        const rel = String(f);
        if (
          rel.includes("node_modules") ||
          rel.includes("__pycache__") ||
          rel.includes(".git")
        )
          continue;
        if (!extensions.some((ext) => rel.endsWith(ext))) continue;
        try {
          const absPath = path.join(repoPath, rel);
          const content = fs.readFileSync(absPath, "utf-8");
          contents.set(rel, content);
        } catch {
          /* skip unreadable */
        }
      }
    } catch {
      logger.warn(`Could not scan source files in ${repoPath}`);
    }

    return contents;
  }

  private readFailingFiles(
    repoPath: string,
    failures: ClassifiedFailure[],
  ): Map<string, string> {
    const contents = new Map<string, string>();

    for (const failure of failures) {
      if (contents.has(failure.file)) continue;

      const absPath = path.isAbsolute(failure.file)
        ? failure.file
        : path.join(repoPath, failure.file);

      try {
        const content = fs.readFileSync(absPath, "utf-8");
        contents.set(failure.file, content);
      } catch {
        logger.warn(`Could not read file: ${absPath}`);
      }
    }

    return contents;
  }

  private applyFixes(
    repoPath: string,
    fixes: GeneratedFix[],
    allFixes: FixRecord[],
  ): number {
    let applied = 0;

    for (const fix of fixes) {
      const absPath = path.isAbsolute(fix.file)
        ? fix.file
        : path.join(repoPath, fix.file);

      try {
        fs.writeFileSync(absPath, fix.correctedContent, "utf-8");
        applied++;

        allFixes.push({
          file: fix.file,
          line: fix.line,
          bugType: fix.originalError,
          error: fix.originalError,
          fixApplied: true,
        });

        logger.info(`Patched: ${fix.file}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to write fix to ${fix.file}: ${msg}`);

        allFixes.push({
          file: fix.file,
          line: fix.line,
          bugType: fix.originalError,
          error: msg,
          fixApplied: false,
        });
      }
    }

    return applied;
  }

  // ── Git helpers ────────────────────────────────────────────

  private buildCommitMessage(fixes: GeneratedFix[]): string {
    const descriptions = fixes
      .map((f) => `${path.basename(f.file)}:${f.line}`)
      .join(", ");
    return `[AI-AGENT] Fix: ${descriptions}`;
  }

  private async commitChanges(
    repoPath: string,
    message: string,
    branch: string,
  ): Promise<void> {
    const git = simpleGit(repoPath);
    await git.add(".");

    try {
      await git.commit(message);
      logger.info(`Committed: ${message}`);
    } catch {
      logger.warn("Nothing to commit (working tree clean)");
    }
  }

  private async pushBranch(
    repoPath: string,
    branch: string,
    repoUrl: string,
  ): Promise<void> {
    if (branch === "main" || branch === "master") {
      throw new Error("Refusing to push to main/master branch");
    }

    const git = simpleGit(repoPath);

    // Inject GitHub token into remote URL for authentication
    const token = config.github.token;
    if (token && repoUrl) {
      try {
        const url = new URL(repoUrl);
        if (url.hostname === "github.com" && !url.username) {
          url.username = token;
          await git.remote(["set-url", "origin", url.toString()]);
          logger.info("Injected token into remote URL");
        }
      } catch {
        logger.warn("Could not inject token into remote URL");
      }
    }

    await git.push("origin", branch, ["--set-upstream", "--force"]);
    logger.info(`Pushed branch: ${branch}`);
  }

  // ── CI monitor ─────────────────────────────────────────────

  private async monitorCI(branch: string): Promise<boolean> {
    logger.info(`Monitoring GitHub Actions CI for branch: ${branch}`);

    const maxPolls = 6; // 6 polls x 5 sec = 30 sec max
    const pollIntervalMs = 5_000;

    for (let i = 0; i < maxPolls; i++) {
      await this.sleep(pollIntervalMs);

      try {
        const runs = await this.github.getLatestWorkflowRuns(10);
        const branchRun = runs.find(
          (r) => r.status === "completed" && r.html_url.includes(branch),
        );

        if (branchRun) {
          if (branchRun.conclusion === "success") {
            logger.info(`CI passed for branch ${branch}`);
            return true;
          }
          if (branchRun.conclusion === "failure") {
            logger.info(`CI failed for branch ${branch}`);
            return false;
          }
        }

        logger.info(`CI poll ${i + 1}/${maxPolls} — still running...`);
      } catch (err) {
        logger.warn(
          `CI poll error: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    logger.warn(`CI monitoring timed out after ${maxPolls} polls`);
    return false;
  }

  // ── Results ────────────────────────────────────────────────

  private buildResult(params: {
    repoUrl: string;
    teamName: string;
    leaderName: string;
    branchName: string;
    status: "PASSED" | "FAILED";
    startTime: number;
    timeline: TimelineEntry[];
    allFixes: FixRecord[];
    iterations: number;
  }): OrchestratorResult {
    // Extract judge-formatted failures from timeline
    const formattedFailures = params.timeline
      .filter((t) => t.event === "CLASSIFIED_FAILURE" && t.detail)
      .map((t) => t.detail!);

    return {
      repository: params.repoUrl,
      teamName: params.teamName,
      leaderName: params.leaderName,
      branch: params.branchName,
      totalFailures: params.allFixes.length,
      totalFixes: params.allFixes.filter((f) => f.fixApplied).length,
      iterations: params.iterations,
      status: params.status,
      timeTaken: Date.now() - params.startTime,
      fixes: params.allFixes,
      timeline: params.timeline,
      formattedFailures,
    };
  }

  private writeResultsJson(result: OrchestratorResult): void {
    const outPath = path.resolve(process.cwd(), "results.json");
    try {
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
      logger.info(`Results written to ${outPath}`);
    } catch (err) {
      logger.error(`Failed to write results.json: ${err}`);
    }
  }

  // ── Utilities ──────────────────────────────────────────────

  private addTimeline(
    timeline: TimelineEntry[],
    event: string,
    detail?: string,
  ): void {
    const entry: TimelineEntry = {
      timestamp: new Date().toISOString(),
      event,
      detail,
    };
    timeline.push(entry);
    if (this.currentProgress) {
      this.currentProgress(entry);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
