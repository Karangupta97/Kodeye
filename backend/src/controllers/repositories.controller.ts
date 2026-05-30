import { Request, Response } from "express";
import {
  getRepositoryById,
  listRepositories,
} from "../services/repositories.service";

export const getRepositories = async (_req: Request, res: Response) => {
  const repositories = await listRepositories();
  res.json({ data: repositories });
};

export const getRepository = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const repository = await getRepositoryById(id);
  res.json({ data: repository });
};
