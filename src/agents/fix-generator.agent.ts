import axios from "axios";
import { createLogger } from "../utils";
import { ClassifiedFailure } from "./failure-classifier.agent";

const logger = createLogger("FixGenerator");

const MAX_LLM_RETRIES = 3;

export interface FixGeneratorConfig {
  apiUrl: string;
  apiKey: string;
}

export interface GeneratedFix {
  file: string;
  line: number;
  originalError: string;
  correctedContent: string;
}

const SYSTEM_PROMPT =
  "You are an autonomous CI/CD healing agent. Return only corrected file content. " +
  "Do not include any explanation, commentary, markdown fences, or triple backticks. " +
  "Output ONLY the raw file content ready to be saved directly to disk. " +
  "IMPORTANT: Python stops at the first SyntaxError, so the error output may only show one bug. " +
  "You MUST proactively read the ENTIRE source code and fix ALL bugs — syntax errors, typos, " +
  "type mismatches, missing colons, wrong variable names, incorrect operations — not just the one shown in the error output.";

function loadFixGeneratorConfig(): FixGeneratorConfig {
  const apiUrl = process.env.NVIDIA_API_URL;
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error(
      "Missing NVIDIA_API_URL or NVIDIA_API_KEY environment variables",
    );
  }

  return { apiUrl, apiKey };
}

export class FixGeneratorAgent {
  private config: FixGeneratorConfig;

  constructor(config?: FixGeneratorConfig) {
    this.config = config ?? loadFixGeneratorConfig();
  }

  async generateFix(
    failure: ClassifiedFailure,
    fileContent: string,
  ): Promise<GeneratedFix> {
    logger.info(
      `Generating fix for ${failure.bugType} in ${failure.file}:${failure.line}`,
    );

    const userPrompt = this.buildPrompt(failure, fileContent);
    const correctedContent = await this.callApiWithRetry(
      userPrompt,
      fileContent,
    );

    return {
      file: failure.file,
      line: failure.line,
      originalError: failure.errorMessage,
      correctedContent,
    };
  }

  async generateFixes(
    failures: ClassifiedFailure[],
    fileContents: Map<string, string>,
  ): Promise<GeneratedFix[]> {
    const fixes: GeneratedFix[] = [];

    for (const failure of failures) {
      const content = fileContents.get(failure.file);
      if (!content) {
        logger.warn(`No file content available for ${failure.file}, skipping`);
        continue;
      }

      try {
        const fix = await this.generateFix(failure, content);
        fixes.push(fix);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to generate fix for ${failure.file}: ${msg}`);
      }
    }

    logger.info(`Generated ${fixes.length}/${failures.length} fix(es)`);
    return fixes;
  }

  /**
   * Fallback: when the regex classifier can't parse failures,
   * send the raw test output + all source files to the LLM and
   * ask it to fix each file.
   */
  async generateFixesFromRawOutput(
    rawTestOutput: string,
    sourceFiles: Map<string, string>,
    language: string,
  ): Promise<GeneratedFix[]> {
    logger.info(
      `LLM fallback: sending raw output + ${sourceFiles.size} source file(s) to fix`,
    );
    const fixes: GeneratedFix[] = [];

    for (const [filePath, content] of sourceFiles) {
      const prompt = [
        `Language: ${language}`,
        `File: ${filePath}`,
        "",
        "Test / execution output (may only show the FIRST error — Python stops at the first SyntaxError):",
        rawTestOutput,
        "",
        `Current content of ${filePath}:`,
        content,
        "",
        "CRITICAL INSTRUCTIONS:",
        "1. Fix ALL errors in this file — not just the one shown in the test output.",
        "2. Python only reports the first SyntaxError, so there may be MORE bugs hiding after it.",
        "3. Read every line of the source carefully. Fix syntax errors, typos, type mismatches,",
        "   missing colons, wrong variable names, incorrect string/int operations, etc.",
        "4. Return ONLY the corrected file content — no markdown fences, no backticks, no commentary.",
        "5. Output raw file content ONLY.",
      ].join("\n");

      try {
        const corrected = await this.callApiWithRetry(prompt, content);
        // Only add if the LLM actually changed the content
        if (corrected.trim() !== content.trim()) {
          fixes.push({
            file: filePath,
            line: 1,
            originalError: "Detected from raw test output",
            correctedContent: corrected,
          });
          logger.info(`LLM generated fix for ${filePath}`);
        } else {
          logger.info(`LLM returned unchanged content for ${filePath}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`LLM fallback failed for ${filePath}: ${msg}`);
      }
    }

    logger.info(`LLM fallback generated ${fixes.length} fix(es)`);
    return fixes;
  }

  private buildPrompt(failure: ClassifiedFailure, fileContent: string): string {
    return [
      `File: ${failure.file}`,
      `Error type: ${failure.bugType}`,
      `Line: ${failure.line}`,
      `Error: ${failure.errorMessage}`,
      "",
      "Current file content:",
      fileContent,
      "",
      "Return ONLY the corrected file content.",
      "Do NOT include markdown fences, triple backticks, explanations, or any commentary.",
      "Output raw file content ONLY.",
    ].join("\n");
  }

  private async callApiWithRetry(
    userPrompt: string,
    originalContent: string,
  ): Promise<string> {
    for (let attempt = 1; attempt <= MAX_LLM_RETRIES; attempt++) {
      logger.info(
        `NVIDIA Qwen API call — attempt ${attempt}/${MAX_LLM_RETRIES}`,
      );
      const raw = await this.callApi(userPrompt);
      const cleaned = this.sanitizeResponse(raw);

      if (this.looksLikeExplanation(cleaned, originalContent)) {
        logger.warn(
          `Attempt ${attempt}: LLM returned explanation instead of file content — rejecting`,
        );
        if (attempt === MAX_LLM_RETRIES) {
          throw new Error(
            "LLM consistently returned explanation instead of file content after all retries",
          );
        }
        continue;
      }

      return cleaned;
    }

    throw new Error("LLM retry loop exhausted");
  }

  private async callApi(userPrompt: string): Promise<string> {
    const payload = {
      model: "qwen/qwen3.5-397b-a17b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      top_p: 0.95,
      top_k: 20,
      max_tokens: 16384,
      chat_template_kwargs: { enable_thinking: false },
      stream: false,
    };

    try {
      const response = await axios.post(this.config.apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 60_000,
      });

      const content = response.data?.choices?.[0]?.message?.content;

      if (typeof content !== "string" || content.trim().length === 0) {
        throw new Error("API returned empty or invalid response");
      }

      logger.info(`API returned ${content.length} chars`);
      return content;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status ?? "unknown";
        const body = err.response?.data ?? "";
        logger.error(`NVIDIA API error (${status})`, body);
        throw new Error(`NVIDIA API error: HTTP ${status}`);
      }
      throw err;
    }
  }

  /**
   * Strips markdown fences, triple backticks, and trims whitespace.
   * Ensures only raw file content remains.
   */
  private sanitizeResponse(content: string): string {
    let result = content.trim();

    // Strip wrapping ```lang ... ``` blocks
    const fencePattern = /^```[\w]*\n([\s\S]*?)```$/;
    const match = fencePattern.exec(result);
    if (match) {
      result = match[1];
    }

    // Strip any remaining leading/trailing fences
    result = result.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");

    // Remove any stray triple backticks anywhere
    result = result.replace(/```/g, "");

    // Trim final result
    result = result.trim();

    // Ensure trailing newline (standard file ending)
    if (result.length > 0 && !result.endsWith("\n")) {
      result += "\n";
    }

    return result;
  }

  /**
   * Detects if the LLM returned explanation text instead of code.
   * Returns true if the response looks like commentary rather than file content.
   */
  private looksLikeExplanation(
    response: string,
    originalContent: string,
  ): boolean {
    const lines = response.split("\n");
    const totalLines = lines.length;
    const originalLines = originalContent.split("\n").length;

    // If response is way shorter than original, it's probably explanation
    if (totalLines < originalLines * 0.3 && totalLines < 5) {
      return true;
    }

    // Count lines that look like natural language explanation
    const explanationPatterns = [
      /^(Here|The|This|I |In |To |We |You |Note|Below|Above|Let me)/i,
      /^(The fix|The error|The issue|The problem|The solution)/i,
      /^(Step \d|First,|Second,|Finally,|However,|Therefore)/i,
      /^\d+\.\s+\w/, // numbered list
      /^[-*]\s+\w/, // bullet list
    ];

    let explanationLines = 0;
    for (const line of lines.slice(0, 10)) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      if (explanationPatterns.some((p) => p.test(trimmed))) {
        explanationLines++;
      }
    }

    // If more than 30% of the first 10 lines look like explanation → reject
    if (explanationLines >= 3) {
      return true;
    }

    return false;
  }
}
