import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { getPullRequestById } from "../services/pullRequests.service";
import { getRepositoryById } from "../services/repositories.service";
import { listPullRequestFiles } from "../services/pullRequestFiles.service";
import { listReviewsByPR } from "../services/aiReviews.service";
import { getRiskScoreByPR } from "../services/riskScores.service";
import { runAIReview, ReviewRequest } from "../ai/ai.service";
import { getPullRequest as fetchGHPullRequest, getPullRequestFiles as fetchGHFiles } from "../github/pr.service";

export const triggerAIReview = async (req: Request, res: Response) => {
  const prId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;

  logger.info("AI Review: Trigger requested", { prId });

  try {
    logger.info("AI Review: Step 1 — Fetching pull request from DB", { prId });
    const pullRequest = await getPullRequestById(prId);
    logger.info("AI Review: Step 1 ✓ — Pull request fetched", {
      prId,
      title: pullRequest.title,
      pr_number: pullRequest.pr_number,
      repo_id: pullRequest.repo_id,
    });

    logger.info("AI Review: Step 2 — Fetching repository from DB", { repoId: pullRequest.repo_id });
    const repository = await getRepositoryById(pullRequest.repo_id);
    logger.info("AI Review: Step 2 ✓ — Repository fetched", {
      owner: repository.owner,
      repo: repository.repo_name,
      installationId: repository.installation_id,
    });

    logger.info("AI Review: Step 3 — Fetching PR files from DB", { prId });
    let files = await listPullRequestFiles(prId);
    logger.info("AI Review: Step 3 ✓ — PR files fetched from DB", {
      fileCount: files.length,
      filesWithPatches: files.filter((f: any) => f.patch).length,
    });

    // Fallback: if no files in DB, fetch directly from GitHub
    if (!files.length) {
      logger.info("AI Review: Step 3b — No files in DB, fetching from GitHub API");
      try {
        const ghFiles = await fetchGHFiles({
          installationId: repository.installation_id,
          owner: repository.owner,
          repo: repository.repo_name,
          pullNumber: pullRequest.pr_number,
        });
        files = (ghFiles || []).map((f: any) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          patch: f.patch || null,
        }));
        logger.info("AI Review: Step 3b ✓ — Files fetched from GitHub", {
          fileCount: files.length,
          filesWithPatches: files.filter((f: any) => f.patch).length,
        });
      } catch (ghError) {
        logger.error("AI Review: Step 3b ✗ — GitHub file fetch failed", {
          error: (ghError as Error).message,
          stack: (ghError as Error).stack,
        });
      }
    }

    if (!files.length) {
      logger.warn("AI Review: No files found for PR from any source", { prId });
      return res.status(400).json({
        error: "No files found for this pull request. Check your GitHub App private key.",
      });
    }

    const owner = repository.owner;
    const repo = repository.repo_name;
    const installationId = repository.installation_id;

    let commitSha: string;
    try {
      logger.info("AI Review: Step 4 — Fetching PR from GitHub API", {
        owner,
        repo,
        prNumber: pullRequest.pr_number,
        installationId,
      });
      const ghPR = await fetchGHPullRequest({
        installationId,
        owner,
        repo,
        pullNumber: pullRequest.pr_number,
      });
      commitSha = ghPR.head.sha;
      logger.info("AI Review: Step 4 ✓ — GitHub PR fetched", { commitSha });
    } catch (error) {
      logger.error("AI Review: Step 4 ✗ — Failed to fetch PR from GitHub", {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      return res.status(500).json({
        error: "Failed to fetch PR details from GitHub",
      });
    }

    const reviewRequest: ReviewRequest = {
      prId,
      prNumber: pullRequest.pr_number,
      prTitle: pullRequest.title,
      prAuthor: pullRequest.author,
      prBranch: pullRequest.branch,
      commitSha,
      repositoryFullName: repository.full_name,
      owner,
      repo,
      installationId,
      files: files.map((f: any) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch,
      })),
    };

    logger.info("AI Review: Step 5 — Starting AI review pipeline", {
      prId,
      fileCount: reviewRequest.files.length,
    });

    const result = await runAIReview(reviewRequest);

    logger.info("AI Review: Step 6 ✓ — AI review pipeline complete", {
      prId,
      issuesFound: result.issues.length,
      riskScores: result.riskScores,
      commentsPosted: result.commentsPosted,
      duration: `${result.duration}ms`,
    });

    res.json({
      data: {
        issues: result.issues,
        riskScores: result.riskScores,
        commentsPosted: result.commentsPosted,
        duration: result.duration,
      },
    });
  } catch (error) {
    logger.error("AI Review: Trigger FAILED with exception", {
      prId,
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    res.status(500).json({ error: "AI review failed" });
  }
};

export const getAIReviews = async (req: Request, res: Response) => {
  try {
    const prId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const reviews = await listReviewsByPR(prId);
    res.json({ data: reviews });
  } catch (error) {
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
    const riskScore = await getRiskScoreByPR(prId);

    res.json({
      data: riskScore || {
        overall_score: 0,
        security_score: 0,
        performance_score: 0,
        maintainability_score: 0,
      },
    });
  } catch (error) {
    logger.error("GET /api/pull-requests/:id/risk-score failed", {
      error: (error as Error).message,
    });
    res.status(500).json({ error: "Failed to load risk score" });
  }
};
