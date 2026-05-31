import { Request, Response } from "express";
import { getAuthedUserId } from "../middleware/requireAuth";
import {
  getRepositoryById,
  listRepositories,
} from "../services/repositories.service";
import { ResourceNotFoundError } from "../utils/ownership";
import { cached } from "../utils/cache";

const REPOS_TTL_MS = 60_000;

export const getRepositories = async (req: Request, res: Response) => {
  const userId = getAuthedUserId(req);
  const timer = req.timer!;

  const repositories = await timer.timeDatabase("listRepositories", () =>
    cached(`repos:${userId}`, REPOS_TTL_MS, () => listRepositories(userId))
  );

  res.json({ data: repositories });
};

export const getRepository = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const repository = await getRepositoryById(id, getAuthedUserId(req));
    if (!repository) {
      throw new ResourceNotFoundError();
    }
    res.json({ data: repository });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return res.status(404).json({ error: "Repository not found" });
    }
    throw error;
  }
};
