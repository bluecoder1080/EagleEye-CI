import { ClassifiedFailure } from "../agents/failure-classifier.agent";

/**
 * Formats a classified failure to the EXACT judge-required format.
 *
 * Output format (no variation allowed):
 *   <BUG_TYPE> error in <file> line <line> → Fix: <human readable fix>
 *
 * Example:
 *   LINTING error in src/utils.py line 15 → Fix: remove the import statement
 */
export function formatFailureForJudge(failure: ClassifiedFailure): string {
  const bugType = failure.bugType;
  const file = failure.file;
  const line = failure.line;
  const fix = normalizeFixDescription(failure.fix);

  return `${bugType} error in ${file} line ${line} \u2192 ${fix}`;
}

export function formatAllFailuresForJudge(
  failures: ClassifiedFailure[],
): string[] {
  return failures.map(formatFailureForJudge);
}

/**
 * Ensures the fix description starts with "Fix: " exactly once.
 * Strips leading/trailing whitespace. No extra punctuation.
 */
function normalizeFixDescription(raw: string): string {
  let fix = raw.trim();

  // If it already starts with "Fix:" (case-insensitive), normalize casing
  if (/^fix:\s*/i.test(fix)) {
    fix = "Fix:" + fix.slice(fix.indexOf(":") + 1);
  } else {
    fix = `Fix: ${fix}`;
  }

  // Collapse multiple spaces to single
  fix = fix.replace(/\s+/g, " ");

  return fix;
}
