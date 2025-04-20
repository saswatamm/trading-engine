import config from "../config/config";

type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private context: string;
  private logLevel: LogLevel;

  constructor(context: string) {
    this.context = context;
    this.logLevel = config.logging.level as LogLevel;
  }
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    meta?: Record<string, any>
  ): string {
    const timestamp = new Date().toISOString();

    if (config.logging.format === "json") {
      return JSON.stringify({
        timestamp,
        level,
        context: this.context,
        message,
        ...meta,
      });
    }
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]: ${message}`;

    if (meta) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return logMessage;
  }
  debug(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, meta));
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, meta));
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, meta));
    }
  }
  error(message: string, error?: Error, meta?: Record<string, any>): void {
    if (this.shouldLog("error")) {
      const errorMeta = error
        ? {
            ...meta,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
          }
        : meta;

      console.error(this.formatMessage("error", message, errorMeta));
    }
  }
}
// Factory function to create loggers
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

// Default logger for general use
export default new Logger("app");
