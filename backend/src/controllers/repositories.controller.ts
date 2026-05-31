import { Request, Response } from "express";
import { getAuthedUserId } from "../middleware/requireAuth";
import {
  getRepositoryById,
  listRepositories,
} from "../services/repositories.service";
import { ResourceNotFoundError } from "../utils/ownership";

export const getRepositories = async (req: Request, res: Response) => {
  const repositories = await listRepositories(getAuthedUserId(req));
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
