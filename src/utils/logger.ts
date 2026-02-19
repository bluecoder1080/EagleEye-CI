export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

const LOG_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "\x1b[36m",
  [LogLevel.INFO]: "\x1b[32m",
  [LogLevel.WARN]: "\x1b[33m",
  [LogLevel.ERROR]: "\x1b[31m",
};

const RESET = "\x1b[0m";

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, meta?: unknown): void {
    const timestamp = new Date().toISOString();
    const color = LOG_COLORS[level];
    const prefix = `${color}[${level}]${RESET} ${timestamp} [${this.context}]`;

    if (meta !== undefined) {
      console.log(`${prefix} ${message}`, JSON.stringify(meta, null, 2));
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  debug(message: string, meta?: unknown): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.log(LogLevel.ERROR, message, meta);
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}
