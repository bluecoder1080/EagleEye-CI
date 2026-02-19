import { createLogger } from "./logger";

const logger = createLogger("Retry");

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries: number,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`[${label}] Attempt ${attempt}/${maxRetries}`);
      const result = await fn();
      logger.info(`[${label}] Succeeded on attempt ${attempt}`);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.warn(`[${label}] Attempt ${attempt} failed: ${lastError.message}`);

      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 15000);
        logger.info(`[${label}] Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }

  logger.error(`[${label}] All ${maxRetries} attempts exhausted`);
  throw lastError ?? new Error(`${label}: all retries exhausted`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
