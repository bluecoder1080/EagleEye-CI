import { exec, ExecOptions } from "child_process";
import { createLogger } from "../utils";

const logger = createLogger("ShellService");

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class ShellService {
  async run(
    command: string,
    cwd?: string,
    timeoutMs = 30000,
  ): Promise<ShellResult> {
    logger.info(`Executing: ${command}${cwd ? ` (cwd: ${cwd})` : ""}`);

    return new Promise<ShellResult>((resolve, reject) => {
      const options: ExecOptions = {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env },
      };

      const child = exec(command, options, (error, stdout, stderr) => {
        const result: ShellResult = {
          stdout: stdout?.toString() ?? "",
          stderr: stderr?.toString() ?? "",
          exitCode: error?.code ?? 0,
        };

        if (error && error.killed) {
          logger.error(`Command timed out after ${timeoutMs}ms: ${command}`);
          reject(new Error(`Command timed out: ${command}`));
          return;
        }

        if (result.exitCode !== 0) {
          logger.warn(
            `Command exited with code ${result.exitCode}: ${command}`,
          );
        }

        resolve(result);
      });

      child.on("error", (err) => {
        logger.error(`Failed to start command: ${command}`, err.message);
        reject(err);
      });
    });
  }

  async runBuild(projectPath: string): Promise<ShellResult> {
    return this.run("npm run build", projectPath);
  }

  async runTests(projectPath: string): Promise<ShellResult> {
    return this.run("npm test", projectPath, 120000);
  }

  async installDeps(projectPath: string): Promise<ShellResult> {
    return this.run("npm ci", projectPath, 120000);
  }

  async lint(projectPath: string): Promise<ShellResult> {
    return this.run("npm run lint", projectPath);
  }
}
