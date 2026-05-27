import { Request, Response } from "express";
import { getMetrics } from "../services/metrics.service";

export const getMetricsController = async (_req: Request, res: Response) => {
  const metrics = await getMetrics();
  res.json({ data: metrics });
};
