type LogMeta = Record<string, unknown> | undefined;

type LogLevel = "info" | "warn" | "error" | "debug";

const formatMessage = (level: LogLevel, message: string, meta?: LogMeta) => {
  const timestamp = new Date().toISOString();
  if (!meta) {
    return `${timestamp} ${level.toUpperCase()} ${message}`;
  }
  return `${timestamp} ${level.toUpperCase()} ${message} ${JSON.stringify(meta)}`;
};

export const logger = {
  info: (message: string, meta?: LogMeta) =>
    console.log(formatMessage("info", message, meta)),
  warn: (message: string, meta?: LogMeta) =>
    console.warn(formatMessage("warn", message, meta)),
  error: (message: string, meta?: LogMeta) =>
    console.error(formatMessage("error", message, meta)),
  debug: (message: string, meta?: LogMeta) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatMessage("debug", message, meta));
    }
  },
};
