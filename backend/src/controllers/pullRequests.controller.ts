import { Request, Response } from "express";
import {
  listPullRequests,
  getPullRequestById,
  syncPullRequestsFromGithub,
} from "../services/pullRequests.service";
import { listRepositories } from "../services/repositories.service";
import {
  listPullRequestFiles,
  listPullRequestFileCounts,
} from "../services/pullRequestFiles.service";
import { logger } from "../utils/logger";

const toPullRequestResponse = (
  pullRequest: any,
  repository: any,
  issueCount: number,
  aiReviewed: boolean
) => ({
  id: pullRequest.id,
  title: pullRequest.title,
  pr_number: pullRequest.pr_number,
  branch: pullRequest.branch,
  author: pullRequest.author,
  author_avatar_url: `https://github.com/${pullRequest.author}.png`,
  status: pullRequest.status,
  created_at: pullRequest.created_at,
  repository: repository || null,
  repository_name: repository?.repo_name || null,
  risk_score: Math.min(100, 30 + issueCount * 10),
  issue_counts: {
    total: issueCount,
    critical: 0,
    high: issueCount,
    medium: 0,
    low: 0,
  },
  ai_review_status: aiReviewed ? "completed" : "pending",
});

export const getPullRequests = async (req: Request, res: Response) => {
  try {
    const repoId = req.query.repoId as string | undefined;
    const forceSync = req.query.sync === "1";

    logger.info("GET /api/pull-requests request", {
      repoId: repoId || null,
      forceSync,
    });

    let pullRequests = await listPullRequests(repoId);
    if (!pullRequests.length || forceSync) {
      const syncResult = await syncPullRequestsFromGithub(repoId);
      logger.info("Pull request sync completed", syncResult);
      pullRequests = await listPullRequests(repoId);
    }

    const repositories = await listRepositories();

    const repoMap = new Map(repositories.map((repo) => [repo.id, repo]));
    const fileCountByPr = await listPullRequestFileCounts(
      pullRequests.map((pullRequest) => pullRequest.id)
    );

    const enriched = pullRequests.map((pullRequest) =>
      toPullRequestResponse(
        pullRequest,
        repoMap.get(pullRequest.repo_id) || null,
        fileCountByPr.get(pullRequest.id) || 0,
        (fileCountByPr.get(pullRequest.id) || 0) > 0
      )
    );

    logger.info("GET /api/pull-requests response", {
      count: enriched.length,
    });

    res.json({ data: enriched });
  } catch (error) {
    logger.error("GET /api/pull-requests failed", {
      error: (error as Error).message,
    });
    res.status(500).json({ error: "Failed to load pull requests" });
  }
};

export const getPullRequest = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const pullRequest = await getPullRequestById(id);
    const repositories = await listRepositories();
    const repoMap = new Map(repositories.map((repo) => [repo.id, repo]));
    const files = await listPullRequestFiles(id);

    res.json({
      data: {
        ...toPullRequestResponse(
          pullRequest,
          repoMap.get(pullRequest.repo_id) || null,
          files.length,
          files.length > 0
        ),
        files,
      },
    });
  } catch (error) {
    logger.error("GET /api/pull-requests/:id failed", {
      id: req.params.id,
      error: (error as Error).message,
    });
    res.status(500).json({ error: "Failed to load pull request" });
  }
};

export const getPullRequestFiles = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const files = await listPullRequestFiles(id);
    res.json({ data: files });
  } catch (error) {
    logger.error("GET /api/pull-requests/:id/files failed", {
      id: req.params.id,
      error: (error as Error).message,
    });
    res.status(500).json({ error: "Failed to load pull request files" });
  }
};
