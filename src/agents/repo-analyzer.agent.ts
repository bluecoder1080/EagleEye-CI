import path from "path";
import fs from "fs";
import os from "os";
import simpleGit from "simple-git";
import { createLogger } from "../utils";

const logger = createLogger("RepoAnalyzer");

export type DetectedLanguage = "node" | "python" | "unknown";

export interface RepoAnalysis {
  repoUrl: string;
  localPath: string;
  language: DetectedLanguage;
  testCommand: string;
  installCommand: string;
  hasLockFile: boolean;
  detectedFiles: string[];
}

const LANGUAGE_MARKERS: Record<DetectedLanguage, string[]> = {
  node: ["package.json", "yarn.lock", "pnpm-lock.yaml", "package-lock.json"],
  python: [
    "requirements.txt",
    "setup.py",
    "pyproject.toml",
    "Pipfile",
    "setup.cfg",
  ],
  unknown: [],
};

export class RepoAnalyzerAgent {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? path.join(os.tmpdir(), "cicd-agent-repos");
    this.ensureBaseDir();
  }

  private ensureBaseDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
      logger.info(`Created repo base directory: ${this.baseDir}`);
    }
  }

  async analyze(repoUrl: string): Promise<RepoAnalysis> {
    logger.info(`Analyzing repository: ${repoUrl}`);

    const localPath = await this.cloneRepo(repoUrl);
    const files = this.listTopLevelFiles(localPath);
    const language = this.detectLanguage(files);
    const testCommand = this.detectTestCommand(localPath, language, files);
    const installCommand = this.detectInstallCommand(language, files);
    const hasLockFile = this.detectLockFile(files);

    const analysis: RepoAnalysis = {
      repoUrl,
      localPath,
      language,
      testCommand,
      installCommand,
      hasLockFile,
      detectedFiles: files,
    };

    logger.info(`Analysis complete`, {
      language,
      testCommand,
      installCommand,
      hasLockFile,
    });

    return analysis;
  }

  private async cloneRepo(repoUrl: string): Promise<string> {
    const repoName = this.extractRepoName(repoUrl);
    const timestamp = Date.now();
    const dirName = `${repoName}-${timestamp}`;
    const targetPath = path.join(this.baseDir, dirName);

    if (fs.existsSync(targetPath)) {
      logger.info(`Directory exists, removing: ${targetPath}`);
      fs.rmSync(targetPath, { recursive: true, force: true });
    }

    logger.info(`Cloning ${repoUrl} → ${targetPath}`);
    const git = simpleGit();
    await git.clone(repoUrl, targetPath, ["--depth", "1"]);
    logger.info(`Clone complete: ${targetPath}`);

    return targetPath;
  }

  private extractRepoName(repoUrl: string): string {
    const sanitized = repoUrl.replace(/\.git$/, "").replace(/\/+$/, "");
    const parts = sanitized.split("/");
    const name = parts[parts.length - 1] || "repo";
    return name.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  private listTopLevelFiles(dir: string): string[] {
    try {
      return fs.readdirSync(dir).filter((f) => !f.startsWith("."));
    } catch {
      logger.warn(`Could not list files in ${dir}`);
      return [];
    }
  }

  private detectLanguage(files: string[]): DetectedLanguage {
    const fileSet = new Set(files);

    for (const marker of LANGUAGE_MARKERS.node) {
      if (fileSet.has(marker)) {
        logger.info(`Detected language: node (marker: ${marker})`);
        return "node";
      }
    }

    for (const marker of LANGUAGE_MARKERS.python) {
      if (fileSet.has(marker)) {
        logger.info(`Detected language: python (marker: ${marker})`);
        return "python";
      }
    }

    // Fallback: check for file extensions
    const hasPyFiles = files.some((f) => f.endsWith(".py"));
    if (hasPyFiles) {
      logger.info("Detected language: python (found .py files)");
      return "python";
    }

    const hasJsTsFiles = files.some(
      (f) => f.endsWith(".js") || f.endsWith(".ts") || f.endsWith(".mjs"),
    );
    if (hasJsTsFiles) {
      logger.info("Detected language: node (found .js/.ts files)");
      return "node";
    }

    logger.warn("Could not detect language from top-level files");
    return "unknown";
  }

  private detectTestCommand(
    localPath: string,
    language: DetectedLanguage,
    files: string[],
  ): string {
    if (language === "node") {
      return this.detectNodeTestCommand(localPath);
    }

    if (language === "python") {
      return this.detectPythonTestCommand(files);
    }

    return "echo 'No test command detected'";
  }

  private detectNodeTestCommand(localPath: string): string {
    const pkgPath = path.join(localPath, "package.json");

    try {
      const raw = fs.readFileSync(pkgPath, "utf-8");
      const pkg = JSON.parse(raw);
      const scripts = pkg.scripts ?? {};

      if (
        scripts.test &&
        scripts.test !== 'echo "Error: no test specified" && exit 1'
      ) {
        logger.info(`Detected Node test script: "${scripts.test}"`);
        return "npm test";
      }

      if (scripts["test:ci"]) return "npm run test:ci";
      if (scripts["test:unit"]) return "npm run test:unit";

      logger.warn("No meaningful test script found in package.json");
      return "npm test";
    } catch {
      logger.warn("Could not read package.json for test command detection");
      return "npm test";
    }
  }

  private detectPythonTestCommand(files: string[]): string {
    const fileSet = new Set(files);

    if (
      fileSet.has("pytest.ini") ||
      fileSet.has("pyproject.toml") ||
      fileSet.has("setup.cfg")
    ) {
      logger.info("Detected pytest configuration");
      return "pytest";
    }

    if (fileSet.has("tox.ini")) {
      logger.info("Detected tox configuration");
      return "tox";
    }

    // Check for test files (test_*.py or *_test.py)
    const hasTestFiles = files.some(
      (f) =>
        f.endsWith(".py") && (f.startsWith("test_") || f.endsWith("_test.py")),
    );
    if (hasTestFiles) {
      logger.info("Found test files, using pytest");
      return "pytest";
    }

    // No test framework: run all .py files directly to check for errors
    const pyFiles = files.filter(
      (f) => f.endsWith(".py") && !f.startsWith("__"),
    );
    if (pyFiles.length > 0) {
      const cmds = pyFiles.map((f) => `python ${f}`).join(" && ");
      logger.info(`No test framework — running Python files directly: ${cmds}`);
      return cmds;
    }

    return "pytest";
  }

  private detectInstallCommand(
    language: DetectedLanguage,
    files: string[],
  ): string {
    const fileSet = new Set(files);

    if (language === "node") {
      if (fileSet.has("package-lock.json")) return "npm ci";
      if (fileSet.has("yarn.lock")) return "yarn install --frozen-lockfile";
      if (fileSet.has("pnpm-lock.yaml"))
        return "pnpm install --frozen-lockfile";
      return "npm install";
    }

    if (language === "python") {
      if (fileSet.has("Pipfile")) return "pipenv install";
      if (fileSet.has("pyproject.toml")) return "pip install -e .";
      if (fileSet.has("requirements.txt"))
        return "pip install -r requirements.txt";
      return "echo 'no dependencies to install'";
    }

    return "echo 'No install command detected'";
  }

  private detectLockFile(files: string[]): boolean {
    const lockFiles = [
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "Pipfile.lock",
      "poetry.lock",
    ];
    return files.some((f) => lockFiles.includes(f));
  }

  cleanup(localPath: string): void {
    if (!localPath.startsWith(this.baseDir)) {
      logger.error(`Refusing to delete path outside base dir: ${localPath}`);
      return;
    }

    try {
      fs.rmSync(localPath, { recursive: true, force: true });
      logger.info(`Cleaned up: ${localPath}`);
    } catch (err) {
      logger.warn(`Cleanup failed for ${localPath}`, err);
    }
  }
}
