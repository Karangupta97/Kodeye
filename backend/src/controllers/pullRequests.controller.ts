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
import { countReviewsByPR } from "../services/aiReviews.service";
import { getRiskScoresForPRs } from "../services/riskScores.service";
import { listReviewsByPR } from "../services/aiReviews.service";
import { getRiskScoreByPR } from "../services/riskScores.service";
import { logger } from "../utils/logger";

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

    const prIds = pullRequests.map((pr) => pr.id);
    const [reviewCounts, riskScores] = await Promise.all([
      countReviewsByPR(prIds),
      getRiskScoresForPRs(prIds),
    ]);

    const enriched = pullRequests.map((pullRequest) =>
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

    const [reviews, riskScore] = await Promise.all([
      listReviewsByPR(id),
      getRiskScoreByPR(id),
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
