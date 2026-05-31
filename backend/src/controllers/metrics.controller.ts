import { Request, Response } from "express";
import { getAuthedUserId } from "../middleware/requireAuth";
import { getMetrics } from "../services/metrics.service";
import { cached } from "../utils/cache";

const METRICS_TTL_MS = 30_000;

export const getMetricsController = async (req: Request, res: Response) => {
  const userId = getAuthedUserId(req);
  const timer = req.timer!;

  const metrics = await timer.timeDatabase("getMetrics", () =>
    cached(`metrics:${userId}`, METRICS_TTL_MS, () => getMetrics(userId))
  );

  res.json({ data: metrics });
};
