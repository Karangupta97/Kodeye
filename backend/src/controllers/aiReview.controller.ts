import { Request, Response } from "express";
import { getAuthedUserId } from "../middleware/requireAuth";
import { logger } from "../utils/logger";
import {
  requirePullRequest,
  requireRepository,
  ResourceNotFoundError,
} from "../utils/ownership";
import { listPullRequestFiles } from "../services/pullRequestFiles.service";
import { listReviewsByPR } from "../services/aiReviews.service";
import { getRiskScoreByPR } from "../services/riskScores.service";
import { runAIReview, ReviewRequest } from "../ai/ai.service";
import {
  getPullRequest as fetchGHPullRequest,
  getPullRequestFiles as fetchGHFiles,
} from "../github/pr.service";
import {
  setReviewProgress,
  clearReviewProgress,
  tryAcquireReviewLock,
  releaseReviewLock,
} from "../services/reviewProgress.service";
import { appendReviewEvent } from "../services/reviewEvents.service";
import { cacheDelete, cacheDeletePrefix } from "../utils/cache";
import { getReviewProgress } from "../services/reviewProgress.service";

const AGENT_DEFS = [
  { id: "security", name: "Security Agent" },
  { id: "bug", name: "Bug Agent" },
  { id: "performance", name: "Performance Agent" },
  { id: "style", name: "Code Style Agent" },
];

export const executeAIReviewPipeline = async (
  prId: string,
  userId: string
) => {
  try {
    const pullRequest = await requirePullRequest(prId, userId);
    const repository = await requireRepository(pullRequest.repo_id, userId);

    let files = await listPullRequestFiles(prId);

    if (!files.length) {
      try {
        const ghFiles = await fetchGHFiles({
          installationId: repository.installation_id,
          owner: repository.owner,
          repo: repository.repo_name,
          pullNumber: pullRequest.pr_number,
        });
        files = (ghFiles || []).map((f: {
          filename: string;
          status: string;
          additions: number;
          deletions: number;
          changes: number;
          patch?: string;
        }) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          patch: f.patch || null,
        }));
      } catch (ghError) {
        logger.error("AI Review: GitHub file fetch failed", {
          prId,
          error: (ghError as Error).message,
        });
      }
    }

    if (!files.length) {
      setReviewProgress({
        prId,
        state: "failed",
        message: "No files found for this pull request",
        progress: 0,
      });
      return;
    }

    const ghPR = await fetchGHPullRequest({
      installationId: repository.installation_id,
      owner: repository.owner,
      repo: repository.repo_name,
      pullNumber: pullRequest.pr_number,
    });

    const reviewRequest: ReviewRequest = {
      prId,
      userId,
      repositoryId: repository.id,
      prNumber: pullRequest.pr_number,
      prTitle: pullRequest.title,
      prAuthor: pullRequest.author,
      prBranch: pullRequest.branch,
      commitSha: ghPR.head.sha,
      repositoryFullName: repository.full_name,
      owner: repository.owner,
      repo: repository.repo_name,
      installationId: repository.installation_id,
      files: files.map((f: {
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        changes: number;
        patch?: string | null;
      }) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch ?? null,
      })),
    };

    setReviewProgress({
      prId,
      state: "preparing_context",
      message: "Preparing Context",
      progress: 10,
      agents: AGENT_DEFS.map((a) => ({
        ...a,
        status: "pending",
        findingsCount: 0,
        executionTimeMs: 0,
      })),
    });

    await appendReviewEvent({
      pr_id: prId,
      user_id: userId,
      event_type: "ai_review_started",
      label: "AI Review Started",
      detail: "Multi-agent analysis running",
      status: "running",
    });

    setReviewProgress({
      prId,
      state: "running_security",
      message: "Running Security Scan",
      progress: 30,
    });

    const result = await runAIReview(reviewRequest);

    setReviewProgress({
      prId,
      state: "calculating_risk",
      message: "Calculating Risk Score",
      progress: 80,
    });

    setReviewProgress({
      prId,
      state: "posting_comments",
      message: "Posting GitHub Comments",
      progress: 90,
    });

    await appendReviewEvent({
      pr_id: prId,
      user_id: userId,
      event_type: "review_completed",
      label: "Review Completed",
      detail: `${result.issues.length} finding(s)`,
      status: "done",
    });

    if (result.commentsPosted > 0) {
      await appendReviewEvent({
        pr_id: prId,
        user_id: userId,
        event_type: "github_comment_posted",
        label: "GitHub Comments Posted",
        detail: `${result.commentsPosted} inline comment(s) on PR #${pullRequest.pr_number}`,
        status: "done",
      });
    }

    setReviewProgress({
      prId,
      state: "completed",
      message: "Completed",
      progress: 100,
      agents: AGENT_DEFS.map((a) => ({
        ...a,
        status: "completed",
        findingsCount: result.issues.filter((i) => i.category === a.id).length,
        executionTimeMs: 1500,
      })),
    });

    cacheDelete(`review-bundle:${userId}:${prId}`);
    cacheDelete(`metrics:${userId}`);
    cacheDeletePrefix(`pull-requests:${userId}`);

    logger.info("AI Review pipeline complete", {
      prId,
      issuesFound: result.issues.length,
      duration: `${result.duration}ms`,
    });
  } catch (error) {
    setReviewProgress({
      prId,
      state: "failed",
      message: (error as Error).message || "AI review failed",
      progress: 0,
    });
    logger.error("AI Review pipeline failed", {
      prId,
      error: (error as Error).message,
    });
  } finally {
    releaseReviewLock(prId);
    setTimeout(() => clearReviewProgress(prId), 60000);
  }
};

export const triggerAIReview = async (req: Request, res: Response) => {
  const prId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const userId = getAuthedUserId(req);
  const waitForCompletion = req.query.wait === "1";

  if (!tryAcquireReviewLock(prId)) {
    return res.status(409).json({
      error: "AI review already in progress for this pull request",
    });
  }

  try {
    await requirePullRequest(prId, userId);

    setReviewProgress({
      prId,
      state: "queued",
      message: "Review Running",
      progress: 5,
    });

    if (waitForCompletion) {
      await executeAIReviewPipeline(prId, userId);
      return res.json({
        data: {
          status: "completed",
          progress: getReviewProgress(prId),
        },
      });
    }

    res.status(202).json({
      data: {
        status: "processing",
        message: "Review Running",
        prId,
      },
    });

    setImmediate(() => {
      void executeAIReviewPipeline(prId, userId);
    });
  } catch (error) {
    releaseReviewLock(prId);
    if (error instanceof ResourceNotFoundError) {
      return res.status(404).json({ error: "Pull request not found" });
    }
    logger.error("AI Review trigger failed", {
      prId,
      error: (error as Error).message,
    });
    res.status(500).json({ error: "Failed to start AI review" });
  }
};

export const getAIReviews = async (req: Request, res: Response) => {
  try {
    const prId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const userId = getAuthedUserId(req);
    await requirePullRequest(prId, userId);
    const reviews = await listReviewsByPR(prId, userId);
    res.json({ data: reviews });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return res.status(404).json({ error: "Pull request not found" });
    }
    logger.error("GET /api/pull-requests/:id/reviews failed", {
      error: (error as Error).message,
    });
    res.status(500).json({ error: "Failed to load AI reviews" });
  }
};

export const getAIRiskScore = async (req: Request, res: Response) => {
  try {
    const prId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const userId = getAuthedUserId(req);
    await requirePullRequest(prId, userId);
    const riskScore = await getRiskScoreByPR(prId, userId);

    res.json({
      data: riskScore || {
        overall_score: 0,
        security_score: 0,
        performance_score: 0,
        maintainability_score: 0,
      },
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return res.status(404).json({ error: "Pull request not found" });
    }
    logger.error("GET /api/pull-requests/:id/risk-score failed", {
      error: (error as Error).message,
    });
    res.status(500).json({ error: "Failed to load risk score" });
  }
};
