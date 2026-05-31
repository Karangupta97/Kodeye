import { Request, Response } from "express";
import { getAuthedUserId } from "../middleware/requireAuth";
import { getMetrics } from "../services/metrics.service";

export const getMetricsController = async (req: Request, res: Response) => {
  const metrics = await getMetrics(getAuthedUserId(req));
  res.json({ data: metrics });
};
