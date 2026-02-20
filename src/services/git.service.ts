import simpleGit, { SimpleGit, SimpleGitOptions } from "simple-git";
import path from "path";
import fs from "fs";
import { createLogger, config } from "../utils";

const logger = createLogger("GitService");

export class GitService {
  private git: SimpleGit;
  private workDir: string;

  constructor(workDir?: string) {
    this.workDir = workDir ?? path.resolve(process.cwd(), "workspace");
    this.ensureWorkDir();

    const options: Partial<SimpleGitOptions> = {
      baseDir: this.workDir,
      binary: "git",
      maxConcurrentProcesses: 4,
    };

    this.git = simpleGit(options);
  }

  /**
   * Inject GitHub token into a repo URL for authentication.
   * Converts https://github.com/owner/repo.git → https://<token>@github.com/owner/repo.git
   */
  private injectToken(repoUrl: string, customToken?: string): string {
    const token = customToken || config.github.token;
    if (!token) return repoUrl;

    try {
      const url = new URL(repoUrl);
      if (url.hostname === "github.com" && !url.username) {
        url.username = "x-access-token";
        url.password = token;
        return url.toString();
      }
    } catch {
      // Not a valid URL, return as-is
    }
    return repoUrl;
  }

  private ensureWorkDir(): void {
    if (!fs.existsSync(this.workDir)) {
      fs.mkdirSync(this.workDir, { recursive: true });
      logger.info(`Created workspace directory: ${this.workDir}`);
    }
  }

  async clone(repoUrl: string, directory?: string): Promise<string> {
    const targetDir = directory ?? path.basename(repoUrl, ".git");
    const fullPath = path.join(this.workDir, targetDir);

    // Use token-injected URL for cloning (enables push later)
    const authUrl = this.injectToken(repoUrl);

    if (fs.existsSync(fullPath)) {
      logger.info(`Repo already exists at ${fullPath}, pulling latest`);
      const localGit = simpleGit(fullPath);
      // Update remote URL to use token (in case it was cloned without one)
      await localGit.remote(["set-url", "origin", authUrl]);
      await localGit.pull();
      return fullPath;
    }

    logger.info(`Cloning ${repoUrl} into ${fullPath}`);
    await this.git.clone(authUrl, fullPath);
    return fullPath;
  }

  async checkout(repoPath: string, branch: string): Promise<void> {
    logger.info(`Checking out branch "${branch}" in ${repoPath}`);
    const localGit = simpleGit(repoPath);
    await localGit.checkout(branch);
  }

  async createBranch(repoPath: string, branchName: string): Promise<void> {
    logger.info(`Creating branch "${branchName}" in ${repoPath}`);
    const localGit = simpleGit(repoPath);
    await localGit.checkoutLocalBranch(branchName);
  }

  async commitAndPush(
    repoPath: string,
    message: string,
    branch: string,
    repoUrl?: string,
  ): Promise<void> {
    logger.info(`Committing and pushing to "${branch}"`);
    const localGit = simpleGit(repoPath);

    // Ensure remote URL has token for authentication
    if (repoUrl) {
      const authUrl = this.injectToken(repoUrl);
      await localGit.remote(["set-url", "origin", authUrl]);
    }

    await localGit.add(".");
    await localGit.commit(message);
    await localGit.push("origin", branch, ["--set-upstream"]);
  }

  async diff(repoPath: string): Promise<string> {
    const localGit = simpleGit(repoPath);
    return localGit.diff();
  }

  async log(repoPath: string, count = 10): Promise<string[]> {
    const localGit = simpleGit(repoPath);
    const logResult = await localGit.log({ maxCount: count });
    return logResult.all.map(
      (entry) => `${entry.hash.slice(0, 7)} ${entry.message}`,
    );
  }
}
