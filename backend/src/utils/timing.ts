import { performance } from "node:perf_hooks";
import { logger } from "./logger";

export interface TimingBreakdown {
  databaseMs: number;
  githubMs: number;
  aiMs: number;
  serializationMs: number;
  totalMs: number;
}

export class RequestTimer {
  databaseMs = 0;
  githubMs = 0;
  aiMs = 0;
  private readonly start = performance.now();

  async timeDatabase<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const t0 = performance.now();
    try {
      return await fn();
    } finally {
      const elapsed = performance.now() - t0;
      this.databaseMs += elapsed;
      if (elapsed > 100) {
        logger.debug("Slow database call", { label, ms: Math.round(elapsed) });
      }
    }
  }

  async timeGithub<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const t0 = performance.now();
    try {
      return await fn();
    } finally {
      const elapsed = performance.now() - t0;
      this.githubMs += elapsed;
      if (elapsed > 200) {
        logger.debug("Slow GitHub call", { label, ms: Math.round(elapsed) });
      }
    }
  }

  async timeAi<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const t0 = performance.now();
    try {
      return await fn();
    } finally {
      const elapsed = performance.now() - t0;
      this.aiMs += elapsed;
      if (elapsed > 500) {
        logger.debug("Slow AI call", { label, ms: Math.round(elapsed) });
      }
    }
  }

  finish(serializationMs = 0): TimingBreakdown {
    return {
      databaseMs: Math.round(this.databaseMs),
      githubMs: Math.round(this.githubMs),
      aiMs: Math.round(this.aiMs),
      serializationMs: Math.round(serializationMs),
      totalMs: Math.round(performance.now() - this.start),
    };
  }
}

export const logTiming = (
  method: string,
  path: string,
  timing: TimingBreakdown,
  statusCode: number
) => {
  const level =
    timing.totalMs > 300 ? "warn" : timing.totalMs > 150 ? "info" : "debug";

  logger[level]("API timing", {
    method,
    path,
    status: statusCode,
    ...timing,
  });
};
