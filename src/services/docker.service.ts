import { exec } from "child_process";
import path from "path";
import crypto from "crypto";
import { createLogger } from "../utils";
import { DetectedLanguage } from "../agents/repo-analyzer.agent";

const logger = createLogger("DockerService");

export interface DockerTestResult {
  passed: boolean;
  output: string;
  executionTime: number;
  containerId: string;
}

interface DockerRunOptions {
  image: string;
  workdir: string;
  mountPath: string;
  command: string;
  timeoutMs: number;
}

const LANGUAGE_IMAGES: Record<DetectedLanguage, string> = {
  node: "cicd-agent:node",
  python: "cicd-agent:python",
  unknown: "ubuntu:22.04",
};

// Fallback base images if custom images haven't been built yet
const BASE_IMAGES: Record<DetectedLanguage, string> = {
  node: "node:20-alpine",
  python: "python:3.12-slim",
  unknown: "ubuntu:22.04",
};

export class DockerService {
  private defaultTimeoutMs: number;

  constructor(timeoutMs = 120_000) {
    this.defaultTimeoutMs = timeoutMs;
  }

  /**
   * Build custom cicd-agent images from our Dockerfiles.
   * Called once at startup to ensure images exist.
   */
  async buildCustomImages(): Promise<void> {
    const dockerDir = path.resolve(__dirname, "../../docker");

    const builds: Array<{ tag: string; dockerfile: string; base: string }> = [
      {
        tag: "cicd-agent:python",
        dockerfile: "python.Dockerfile",
        base: "python:3.12-slim",
      },
      {
        tag: "cicd-agent:node",
        dockerfile: "node.Dockerfile",
        base: "node:20-alpine",
      },
    ];

    for (const build of builds) {
      const exists = await this.imageExists(build.tag);
      if (exists) {
        logger.info(`Image ${build.tag} already exists`);
        continue;
      }

      const dockerfilePath = path.join(dockerDir, build.dockerfile);
      logger.info(`Building ${build.tag} from ${build.dockerfile}...`);

      try {
        await this.buildImage(build.tag, dockerfilePath, dockerDir);
        logger.info(`Built image: ${build.tag}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(
          `Failed to build ${build.tag}: ${msg} — will use base image ${build.base}`,
        );
      }
    }
  }

  private imageExists(tag: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      exec(`docker image inspect ${tag}`, { timeout: 10_000 }, (error) => {
        resolve(!error);
      });
    });
  }

  private buildImage(
    tag: string,
    dockerfilePath: string,
    contextDir: string,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      exec(
        `docker build -t ${tag} -f "${dockerfilePath}" "${contextDir}"`,
        { timeout: 300_000 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve();
          }
        },
      );
    });
  }

  async runTests(
    projectPath: string,
    language: DetectedLanguage,
    installCommand: string,
    testCommand: string,
  ): Promise<DockerTestResult> {
    const absPath = path.resolve(projectPath);
    // Use custom image if available, fall back to base
    const customImage = LANGUAGE_IMAGES[language];
    const hasCustom = await this.imageExists(customImage);
    const image = hasCustom ? customImage : BASE_IMAGES[language];
    const containerName = this.generateContainerName();

    logger.info(`Running tests in Docker`, {
      image,
      language,
      installCommand,
      testCommand,
      containerName,
    });

    const fullCommand = this.buildCommand(
      language,
      installCommand,
      testCommand,
    );

    const result = await this.dockerRun({
      image,
      workdir: "/app",
      mountPath: absPath,
      command: fullCommand,
      timeoutMs: this.defaultTimeoutMs,
    });

    return result;
  }

  private buildCommand(
    language: DetectedLanguage,
    installCommand: string,
    testCommand: string,
  ): string {
    const safeInstall = this.sanitizeCommand(installCommand);
    const safeTest = this.sanitizeCommand(testCommand);

    if (language === "node") {
      return `sh -c "cd /app && ${safeInstall} && ${safeTest}"`;
    }

    if (language === "python") {
      return `sh -c "cd /app && ${safeInstall} && ${safeTest}"`;
    }

    return `sh -c "cd /app && ${safeInstall} && ${safeTest}"`;
  }

  private async dockerRun(
    options: DockerRunOptions,
  ): Promise<DockerTestResult> {
    const containerName = this.generateContainerName();

    const args = [
      "docker",
      "run",
      "--name",
      containerName,
      "--network",
      "none",
      "--memory",
      "512m",
      "--cpus",
      "1",
      "--pids-limit",
      "256",
      "--read-only",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=256m",
      "--tmpfs",
      "/app/node_modules:rw,exec,size=512m",
      "--tmpfs",
      "/root/.cache:rw,size=256m",
      "-v",
      `${options.mountPath}:/app:ro`,
      "-w",
      options.workdir,
      options.image,
      ...this.splitShellCommand(options.command),
    ];

    const cmd = args
      .map((a) => (a.includes(" ") || a.includes(":") ? `"${a}"` : a))
      .join(" ");

    logger.info(`Executing: ${cmd}`);

    const startTime = Date.now();

    return new Promise<DockerTestResult>((resolve) => {
      const child = exec(
        cmd,
        {
          timeout: options.timeoutMs,
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env },
        },
        (error, stdout, stderr) => {
          const executionTime = Date.now() - startTime;
          const combinedOutput = [
            stdout?.toString() ?? "",
            stderr?.toString() ?? "",
          ]
            .filter(Boolean)
            .join("\n");

          const passed = !error || error.code === 0;

          if (error?.killed) {
            logger.warn(`Container timed out after ${options.timeoutMs}ms`);
          }

          const result: DockerTestResult = {
            passed,
            output: combinedOutput.slice(0, 50_000),
            executionTime,
            containerId: containerName,
          };

          logger.info(
            `Docker test ${passed ? "PASSED" : "FAILED"} in ${executionTime}ms`,
          );

          // Log first 500 chars of output for debugging
          if (combinedOutput.length > 0) {
            const preview = combinedOutput.slice(0, 500).replace(/\n/g, "\n");
            logger.debug(`Docker output preview: ${preview}`);
          }

          resolve(result);
        },
      );

      child.on("error", (err) => {
        const executionTime = Date.now() - startTime;
        logger.error(`Docker process error: ${err.message}`);

        resolve({
          passed: false,
          output: `Docker execution error: ${err.message}`,
          executionTime,
          containerId: containerName,
        });
      });
    });
  }

  private generateContainerName(): string {
    const id = crypto.randomBytes(6).toString("hex");
    return `cicd-agent-${id}`;
  }

  private sanitizeCommand(command: string): string {
    const forbidden = /[;&|`$(){}!\\<>]/g;
    const parts = command.split("&&").map((p) => p.trim());

    const sanitized = parts
      .map((part) => {
        if (this.isAllowedCommand(part)) {
          return part;
        }
        return part.replace(forbidden, "");
      })
      .join(" && ");

    return sanitized;
  }

  private isAllowedCommand(cmd: string): boolean {
    const allowList = [
      /^npm\s+(ci|install|test|run\s+[\w:.-]+)$/,
      /^yarn\s+(install|test|run\s+[\w:.-]+)/,
      /^pnpm\s+(install|test|run\s+[\w:.-]+)/,
      /^pip\s+install\s+/,
      /^pipenv\s+install/,
      /^pytest/,
      /^python\s+-m\s+pytest/,
      /^python\s+[\w.\/-]+\.py/,
      /^python3?\s+[\w.\/-]+\.py/,
      /^tox$/,
      /^echo\s+/,
    ];

    return allowList.some((pattern) => pattern.test(cmd.trim()));
  }

  private splitShellCommand(cmd: string): string[] {
    if (cmd.startsWith("sh -c ")) {
      return ["sh", "-c", cmd.slice(6).replace(/^"/, "").replace(/"$/, "")];
    }
    return cmd.split(" ");
  }

  async isDockerAvailable(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      exec("docker info", { timeout: 5000 }, (error) => {
        if (error) {
          logger.warn("Docker is not available on this host");
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  async pullImage(image: string): Promise<void> {
    logger.info(`Pulling Docker image: ${image}`);
    return new Promise<void>((resolve, reject) => {
      exec(`docker pull ${image}`, { timeout: 300_000 }, (error, stdout) => {
        if (error) {
          logger.error(`Failed to pull image ${image}: ${error.message}`);
          reject(error);
        } else {
          logger.info(`Image pulled: ${image}`);
          resolve();
        }
      });
    });
  }
}
