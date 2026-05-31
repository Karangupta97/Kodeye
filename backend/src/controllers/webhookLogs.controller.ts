import { Request, Response } from "express";
import { getAuthedUserId } from "../middleware/requireAuth";
import { listWebhookLogs } from "../services/webhookLogs.service";

export const getWebhookLogs = async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 25;
  const logs = await listWebhookLogs(getAuthedUserId(req), limit);
  res.json({ data: logs });
};
