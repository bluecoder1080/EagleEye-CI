import { createLogger } from "../utils";

const logger = createLogger("FailureClassifier");

export enum BugType {
  LINTING = "LINTING",
  SYNTAX = "SYNTAX",
  LOGIC = "LOGIC",
  TYPE_ERROR = "TYPE_ERROR",
  IMPORT = "IMPORT",
  INDENTATION = "INDENTATION",
}

export interface ClassifiedFailure {
  bugType: BugType;
  file: string;
  line: number;
  errorMessage: string;
  fix: string;
  raw: string;
}

interface FailurePattern {
  bugType: BugType;
  pattern: RegExp;
  extractFile: (m: RegExpMatchArray) => string;
  extractLine: (m: RegExpMatchArray) => number;
  extractMessage: (m: RegExpMatchArray) => string;
  suggestFix: (m: RegExpMatchArray) => string;
}

/**
 * Normalize Docker container paths (e.g. /app/err.py) to relative paths.
 */
function normalizeFilePath(filePath: string): string {
  // Strip /app/ prefix from Docker container paths
  if (filePath.startsWith("/app/")) {
    return filePath.slice(5);
  }
  return filePath;
}

const PATTERNS: FailurePattern[] = [
  // Python — flake8 / pylint linting
  {
    bugType: BugType.LINTING,
    pattern: /^(.+?):(\d+):\d+:\s*(E\d+|W\d+|C\d+|F\d+)\s+(.+)$/m,
    extractFile: (m) => normalizeFilePath(m[1]),
    extractLine: (m) => parseInt(m[2], 10),
    extractMessage: (m) => `${m[3]} ${m[4]}`,
    suggestFix: (m) => `Fix: resolve linting issue ${m[3]} — ${m[4]}`,
  },
  // Python — IndentationError / TabError (Python 3.10+ has caret lines)
  {
    bugType: BugType.INDENTATION,
    pattern:
      /File "(.+?)", line (\d+)\n(?:.*\n){1,3}(IndentationError|TabError):\s*(.+)/m,
    extractFile: (m) => normalizeFilePath(m[1]),
    extractLine: (m) => parseInt(m[2], 10),
    extractMessage: (m) => `${m[3]}: ${m[4]}`,
    suggestFix: (m) => `Fix: correct indentation at line ${m[2]}`,
  },
  // Python — SyntaxError (Python 3.10+ includes caret `^~~~` lines)
  {
    bugType: BugType.SYNTAX,
    pattern: /File "(.+?)", line (\d+)\n(?:.*\n){1,3}SyntaxError:\s*(.+)/m,
    extractFile: (m) => normalizeFilePath(m[1]),
    extractLine: (m) => parseInt(m[2], 10),
    extractMessage: (m) => `SyntaxError: ${m[3]}`,
    suggestFix: (m) => `Fix: correct syntax error — ${m[3]}`,
  },
  // Python — ImportError / ModuleNotFoundError
  {
    bugType: BugType.IMPORT,
    pattern:
      /File "(.+?)", line (\d+).*\n(?:.*\n){0,4}(ImportError|ModuleNotFoundError):\s*(.+)/m,
    extractFile: (m) => normalizeFilePath(m[1]),
    extractLine: (m) => parseInt(m[2], 10),
    extractMessage: (m) => `${m[3]}: ${m[4]}`,
    suggestFix: (m) =>
      `Fix: ${m[4].includes("cannot import") ? "remove" : "add"} the import statement`,
  },
  // Python — NameError / AttributeError (logic)
  {
    bugType: BugType.LOGIC,
    pattern:
      /File "(.+?)", line (\d+).*\n(?:.*\n){0,4}(NameError|AttributeError):\s*(.+)/m,
    extractFile: (m) => normalizeFilePath(m[1]),
    extractLine: (m) => parseInt(m[2], 10),
    extractMessage: (m) => `${m[3]}: ${m[4]}`,
    suggestFix: (m) => `Fix: resolve ${m[3]} — ${m[4]}`,
  },
  {
    bugType: BugType.TYPE_ERROR,
    pattern: /File "(.+?)", line (\d+).*\n(?:.*\n){0,4}TypeError:\s*(.+)/m,
    extractFile: (m) => normalizeFilePath(m[1]),
    extractLine: (m) => parseInt(m[2], 10),
    extractMessage: (m) => `TypeError: ${m[3]}`,
    suggestFix: (m) => `Fix: resolve type error — ${m[3]}`,
  },
  // Python — AssertionError in tests (logic)
  {
    bugType: BugType.LOGIC,
    pattern: /File "(.+?)", line (\d+).*\n(?:.*\n){0,4}AssertionError:\s*(.+)/m,
    extractFile: (m) => normalizeFilePath(m[1]),
    extractLine: (m) => parseInt(m[2], 10),
    extractMessage: (m) => `AssertionError: ${m[3]}`,
    suggestFix: (m) => `Fix: correct logic producing wrong assertion result`,
  },
  // TypeScript — tsc errors: src/file.ts(10,5): error TS2345: ...
  {
    bugType: BugType.TYPE_ERROR,
    pattern: /(.+?)\((\d+),\d+\):\s*error\s+(TS\d+):\s*(.+)/m,
    extractFile: (m) => m[1],
    extractLine: (m) => parseInt(m[2], 10),
    extractMessage: (m) => `${m[3]}: ${m[4]}`,
    suggestFix: (m) => `Fix: resolve TypeScript error ${m[3]} — ${m[4]}`,
  },
  // TypeScript — tsc errors: src/file.ts:10:5 - error TS2345: ...
  {
    bugType: BugType.TYPE_ERROR,
    pattern: /(.+?):(\d+):\d+\s*-\s*error\s+(TS\d+):\s*(.+)/m,
    extractFile: (m) => m[1],
    extractLine: (m) => parseInt(m[2], 10),
    extractMessage: (m) => `${m[3]}: ${m[4]}`,
    suggestFix: (m) => `Fix: resolve TypeScript error ${m[3]} — ${m[4]}`,
  },
  // ESLint — src/file.ts:10:5 error rule-name message
  {
    bugType: BugType.LINTING,
    pattern: /(.+?):(\d+):\d+\s+error\s+(.+?)\s{2,}(.+)/m,
    extractFile: (m) => m[1],
    extractLine: (m) => parseInt(m[2], 10),
    extractMessage: (m) => `${m[4]}: ${m[3]}`,
    suggestFix: (m) => `Fix: resolve ESLint error ${m[4]}`,
  },
  // Node — SyntaxError with file context
  {
    bugType: BugType.SYNTAX,
    pattern: /(.+?):(\d+)\n.*\nSyntaxError:\s*(.+)/m,
    extractFile: (m) => m[1],
    extractLine: (m) => parseInt(m[2], 10),
    extractMessage: (m) => `SyntaxError: ${m[3]}`,
    suggestFix: (m) => `Fix: correct syntax error — ${m[3]}`,
  },
  // Node — Cannot find module (import)
  {
    bugType: BugType.IMPORT,
    pattern:
      /Error:\s*Cannot find module '(.+?)'\n.*\n\s+at.*\((.+?):(\d+):\d+\)/m,
    extractFile: (m) => m[2],
    extractLine: (m) => parseInt(m[3], 10),
    extractMessage: (m) => `Cannot find module '${m[1]}'`,
    suggestFix: (m) => `Fix: install or correct the import for '${m[1]}'`,
  },
  // Generic — file:line: error message fallback
  {
    bugType: BugType.SYNTAX,
    pattern: /(.+?):(\d+)(?::\d+)?:\s*(?:error|Error):\s*(.+)/m,
    extractFile: (m) => m[1],
    extractLine: (m) => parseInt(m[2], 10),
    extractMessage: (m) => m[3],
    suggestFix: (m) => `Fix: resolve error — ${m[3]}`,
  },
];

export class FailureClassifierAgent {
  classify(rawOutput: string): ClassifiedFailure[] {
    logger.info("Classifying test output failures");
    const failures: ClassifiedFailure[] = [];
    const seen = new Set<string>();

    for (const entry of PATTERNS) {
      const regex = new RegExp(entry.pattern.source, entry.pattern.flags + "g");
      let match: RegExpExecArray | null;

      while ((match = regex.exec(rawOutput)) !== null) {
        const file = entry.extractFile(match);
        const line = entry.extractLine(match);
        const errorMessage = entry.extractMessage(match);
        const fix = entry.suggestFix(match);

        const key = `${entry.bugType}:${file}:${line}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const failure: ClassifiedFailure = {
          bugType: entry.bugType,
          file,
          line,
          errorMessage,
          fix,
          raw: match[0],
        };

        failures.push(failure);
      }
    }

    logger.info(`Classified ${failures.length} failure(s)`);
    return failures;
  }

  format(failure: ClassifiedFailure): string {
    return `${failure.bugType} error in ${failure.file} line ${failure.line} → ${failure.fix}`;
  }

  formatAll(failures: ClassifiedFailure[]): string[] {
    return failures.map((f) => this.format(f));
  }
}
