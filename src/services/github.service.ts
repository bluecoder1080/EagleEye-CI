import { config, createLogger } from "../utils";

const logger = createLogger("GitHubService");

// Dynamic import to handle ESM-only @octokit/rest
let _Octokit: typeof import("@octokit/rest").Octokit;
async function getOctokit() {
  if (!_Octokit) {
    const mod = await import("@octokit/rest");
    _Octokit = mod.Octokit;
  }
  return _Octokit;
}

export interface WorkflowRun {
  id: number;
  name: string | null;
  status: string | null;
  conclusion: string | null;
  html_url: string;
  created_at: string;
}

export interface WorkflowLog {
  runId: number;
  logs: string;
}

export class GitHubService {
  private octokit: InstanceType<typeof import("@octokit/rest").Octokit> | null =
    null;
  private owner: string;
  private repo: string;

  constructor() {
    this.owner = config.github.owner;
    this.repo = config.github.repo;
  }

  private async getClient() {
    if (!this.octokit) {
      const Octokit = await getOctokit();
      this.octokit = new Octokit({ auth: config.github.token });
    }
    return this.octokit;
  }

  async getLatestWorkflowRuns(count = 5): Promise<WorkflowRun[]> {
    logger.info(`Fetching latest ${count} workflow runs`);
    const octokit = await this.getClient();
    const { data } = await octokit.actions.listWorkflowRunsForRepo({
      owner: this.owner,
      repo: this.repo,
      per_page: count,
    });

    return data.workflow_runs.map((run) => ({
      id: run.id,
      name: run.name ?? null,
      status: run.status,
      conclusion: run.conclusion,
      html_url: run.html_url,
      created_at: run.created_at,
    }));
  }

  async getFailedRuns(): Promise<WorkflowRun[]> {
    logger.info("Fetching failed workflow runs");
    const runs = await this.getLatestWorkflowRuns(20);
    return runs.filter((r) => r.conclusion === "failure");
  }

  async getWorkflowLogs(runId: number): Promise<WorkflowLog> {
    logger.info(`Downloading logs for run ${runId}`);
    try {
      const octokit = await this.getClient();
      const { data } = await octokit.actions.downloadWorkflowRunLogs({
        owner: this.owner,
        repo: this.repo,
        run_id: runId,
      });
      return { runId, logs: typeof data === "string" ? data : String(data) };
    } catch (err) {
      logger.warn(
        `Could not download logs for run ${runId}, fetching jobs instead`,
      );
      return this.getWorkflowJobLogs(runId);
    }
  }

  private async getWorkflowJobLogs(runId: number): Promise<WorkflowLog> {
    const octokit = await this.getClient();
    const { data } = await octokit.actions.listJobsForWorkflowRun({
      owner: this.owner,
      repo: this.repo,
      run_id: runId,
    });

    const summaries = data.jobs.map((job) => {
      const steps = (job.steps ?? [])
        .map((s) => `  Step "${s.name}": ${s.conclusion ?? s.status}`)
        .join("\n");
      return `Job "${job.name}" (${job.conclusion ?? job.status}):\n${steps}`;
    });

    return { runId, logs: summaries.join("\n\n") };
  }

  async rerunWorkflow(runId: number): Promise<void> {
    logger.info(`Re-running workflow ${runId}`);
    const octokit = await this.getClient();
    await octokit.actions.reRunWorkflow({
      owner: this.owner,
      repo: this.repo,
      run_id: runId,
    });
  }

  async createIssue(title: string, body: string): Promise<number> {
    logger.info(`Creating issue: ${title}`);
    const octokit = await this.getClient();
    const { data } = await octokit.issues.create({
      owner: this.owner,
      repo: this.repo,
      title,
      body,
      labels: ["cicd-healing-agent"],
    });
    return data.number;
  }

  async createPullRequestComment(
    prNumber: number,
    body: string,
  ): Promise<void> {
    logger.info(`Commenting on PR #${prNumber}`);
    const octokit = await this.getClient();
    await octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body,
    });
  }
}
