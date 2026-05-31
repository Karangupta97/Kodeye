import { performance } from "node:perf_hooks";
import { Request, Response, NextFunction } from "express";
import { RequestTimer, logTiming } from "../utils/timing";

declare global {
  namespace Express {
    interface Request {
      timer?: RequestTimer;
    }
  }
}

export const timingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const timer = new RequestTimer();
  req.timer = timer;

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    const serializeStart = performance.now();
    const result = originalJson(body);
    const serializationMs = performance.now() - serializeStart;
    const timing = timer.finish(serializationMs);

    res.setHeader("Server-Timing", [
      `db;dur=${timing.databaseMs}`,
      `github;dur=${timing.githubMs}`,
      `ai;dur=${timing.aiMs}`,
      `total;dur=${timing.totalMs}`,
    ].join(", "));

    logTiming(req.method, req.originalUrl || req.url, timing, res.statusCode);
    return result;
  };

  next();
};
