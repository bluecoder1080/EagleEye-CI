import simpleGit, { SimpleGit, SimpleGitOptions } from "simple-git";
import path from "path";
import fs from "fs";
import { createLogger } from "../utils";

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

  private ensureWorkDir(): void {
    if (!fs.existsSync(this.workDir)) {
      fs.mkdirSync(this.workDir, { recursive: true });
      logger.info(`Created workspace directory: ${this.workDir}`);
    }
  }

  async clone(repoUrl: string, directory?: string): Promise<string> {
    const targetDir = directory ?? path.basename(repoUrl, ".git");
    const fullPath = path.join(this.workDir, targetDir);

    if (fs.existsSync(fullPath)) {
      logger.info(`Repo already exists at ${fullPath}, pulling latest`);
      const localGit = simpleGit(fullPath);
      await localGit.pull();
      return fullPath;
    }

    logger.info(`Cloning ${repoUrl} into ${fullPath}`);
    await this.git.clone(repoUrl, fullPath);
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
  ): Promise<void> {
    logger.info(`Committing and pushing to "${branch}"`);
    const localGit = simpleGit(repoPath);
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
