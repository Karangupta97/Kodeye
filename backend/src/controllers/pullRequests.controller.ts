import { Request, Response } from "express";
import {
  listPullRequests,
  getPullRequestById,
} from "../services/pullRequests.service";
import { listRepositories } from "../services/repositories.service";
import { listPullRequestFiles } from "../services/pullRequestFiles.service";

export const getPullRequests = async (req: Request, res: Response) => {
  const repoId = req.query.repoId as string | undefined;
  const [pullRequests, repositories] = await Promise.all([
    listPullRequests(repoId),
    listRepositories(),
  ]);

  const repoMap = new Map(repositories.map((repo) => [repo.id, repo]));
  const enriched = pullRequests.map((pullRequest) => ({
    ...pullRequest,
    repository: repoMap.get(pullRequest.repo_id) || null,
  }));

  res.json({ data: enriched });
};

export const getPullRequest = async (req: Request, res: Response) => {
  const pullRequest = await getPullRequestById(req.params.id);
  const repositories = await listRepositories();
  const repoMap = new Map(repositories.map((repo) => [repo.id, repo]));
  const files = await listPullRequestFiles(req.params.id);

  res.json({
    data: {
      ...pullRequest,
      repository: repoMap.get(pullRequest.repo_id) || null,
      files,
    },
  });
};

export const getPullRequestFiles = async (req: Request, res: Response) => {
  const files = await listPullRequestFiles(req.params.id);
  res.json({ data: files });
};
