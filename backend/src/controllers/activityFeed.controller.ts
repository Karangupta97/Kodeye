import { Request, Response } from "express";
import { getActivityFeed } from "../services/activityFeed.service";
import { logger } from "../utils/logger";

export const getActivityFeedHandler = async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 30, 50);

  try {
    const feed = await getActivityFeed(limit);
    res.json({ data: feed });
  } catch (error) {
    logger.error("GET activity feed failed", {
      error: (error as Error).message,
    });
    res.status(500).json({ error: "Failed to load activity feed" });
  }
};
