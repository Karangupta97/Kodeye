import { Request, Response } from "express";
import { getAuthedUserId } from "../middleware/requireAuth";
import {
  listPullRequests,
  syncPullRequestsFromGithub,
} from "../services/pullRequests.service";
import { listRepositories, getRepositoriesByIds } from "../services/repositories.service";
import { listPullRequestFiles } from "../services/pullRequestFiles.service";
import { countReviewsByPR, listReviewsByPR } from "../services/aiReviews.service";
import { getRiskScoresForPRs, getRiskScoreByPR } from "../services/riskScores.service";
import { logger } from "../utils/logger";
import { requirePullRequest, ResourceNotFoundError } from "../utils/ownership";
import { cached } from "../utils/cache";
import type { RequestTimer } from "../utils/timing";

const toPullRequestResponse = (
  pullRequest: any,
  repository: any,
  issueCounts: {
    total: number;
    critical: number;
    warning: number;
    suggestion: number;
  },
  riskScore: {
    overall_score: number;
    security_score: number;
    performance_score: number;
    maintainability_score: number;
  } | null
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
  risk_score: riskScore?.overall_score ?? 0,
  risk_scores: riskScore
    ? {
        overall: riskScore.overall_score,
        security: riskScore.security_score,
        performance: riskScore.performance_score,
        maintainability: riskScore.maintainability_score,
      }
    : null,
  issue_counts: {
    total: issueCounts.total,
    critical: issueCounts.critical,
    high: issueCounts.warning,
    medium: issueCounts.suggestion,
    low: 0,
  },
  ai_review_status: issueCounts.total > 0 || riskScore ? "completed" : "pending",
});

const buildEnrichedPullRequests = async (
  pullRequests: Array<{ id: string; repo_id: string } & Record<string, unknown>>,
  repoMap: Map<string, unknown>,
  prIds: string[],
  userId: string,
  timer: RequestTimer
) => {
  const [reviewCounts, riskScores] = await timer.timeDatabase(
    "enrichPullRequests",
    () =>
      Promise.all([
        countReviewsByPR(prIds, userId),
        getRiskScoresForPRs(prIds, userId),
      ])
  );

  return pullRequests.map((pullRequest) =>
    toPullRequestResponse(
      pullRequest,
      repoMap.get(pullRequest.repo_id) || null,
      reviewCounts.get(pullRequest.id) || {
        total: 0,
        critical: 0,
        warning: 0,
        suggestion: 0,
      },
      riskScores.get(pullRequest.id) || null
    )
  );
};

export const getPullRequests = async (req: Request, res: Response) => {
  const timer = req.timer!;
  try {
    const repoId = req.query.repoId as string | undefined;
    const forceSync = req.query.sync === "1";
    const userId = getAuthedUserId(req);

    logger.info("GET /api/pull-requests request", {
      repoId: repoId || null,
      forceSync,
      userId,
    });

    let pullRequests = await timer.timeDatabase("listPullRequests", () =>
      listPullRequests(userId, repoId)
    );
    if (forceSync) {
      const syncResult = await timer.timeGithub("syncPullRequests", () =>
        syncPullRequestsFromGithub(userId, repoId)
      );
      logger.info("Pull request sync completed", syncResult);
      pullRequests = await timer.timeDatabase("listPullRequestsAfterSync", () =>
        listPullRequests(userId, repoId)
      );
    }

    const repoIds = [...new Set(pullRequests.map((pr) => pr.repo_id))];
    const repositories = await timer.timeDatabase("getRepositoriesByIds", () =>
      getRepositoriesByIds(repoIds, userId)
    );
    const repoMap = new Map(repositories.map((repo) => [repo.id, repo]));

    const prIds = pullRequests.map((pr) => pr.id);
    const cacheKey = `pull-requests:${userId}:${repoId || "all"}:${forceSync ? "sync" : "list"}`;

    const enriched = forceSync
      ? await buildEnrichedPullRequests(
          pullRequests,
          repoMap,
          prIds,
          userId,
          timer
        )
      : await cached(cacheKey, 20_000, () =>
          buildEnrichedPullRequests(
            pullRequests,
            repoMap,
            prIds,
            userId,
            timer
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
    const userId = getAuthedUserId(req);
    const pullRequest = await requirePullRequest(id, userId);
    const repositories = await listRepositories(userId);
    const repoMap = new Map(repositories.map((repo) => [repo.id, repo]));
    const files = await listPullRequestFiles(id);

    const [reviews, riskScore] = await Promise.all([
      listReviewsByPR(id, userId),
      getRiskScoreByPR(id, userId),
    ]);

    const issueCounts = {
      total: reviews.length,
      critical: reviews.filter((r: any) => r.severity === "critical").length,
      warning: reviews.filter((r: any) => r.severity === "warning").length,
      suggestion: reviews.filter((r: any) => r.severity === "suggestion").length,
    };

    res.json({
      data: {
        ...toPullRequestResponse(
          pullRequest,
          repoMap.get(pullRequest.repo_id) || null,
          issueCounts,
          riskScore
        ),
        files,
        reviews,
        risk_score_detail: riskScore || null,
      },
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return res.status(404).json({ error: "Pull request not found" });
    }
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
    await requirePullRequest(id, getAuthedUserId(req));
    const includePatch = req.query.includePatch === "1";
    const filename = req.query.filename as string | undefined;
    const files = await listPullRequestFiles(id, { includePatch, filename });
    res.json({ data: files });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return res.status(404).json({ error: "Pull request not found" });
    }
    logger.error("GET /api/pull-requests/:id/files failed", {
      id: req.params.id,
      error: (error as Error).message,
    });
    res.status(500).json({ error: "Failed to load pull request files" });
  }
};
