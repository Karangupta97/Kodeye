import { Request, Response } from "express";
import { listWebhookLogs } from "../services/webhookLogs.service";

export const getWebhookLogs = async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 25;
  const logs = await listWebhookLogs(limit);
  res.json({ data: logs });
};
