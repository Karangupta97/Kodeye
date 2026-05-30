import { Router } from "express";
import { getRepositories, getRepository } from "../controllers/repositories.controller";
import {
  getPullRequest,
  getPullRequestFiles,
  getPullRequests,
} from "../controllers/pullRequests.controller";
import { getWebhookLogs } from "../controllers/webhookLogs.controller";
import { getActivityFeedHandler } from "../controllers/activityFeed.controller";
import { getMetricsController } from "../controllers/metrics.controller";
import {
  triggerAIReview,
  getAIReviews,
  getAIRiskScore,
} from "../controllers/aiReview.controller";
import {
  getReviewBundle,
  reanalyzeReview,
  shareReview,
  exportReview,
  updateFindingInteraction,
  streamReviewProgress,
} from "../controllers/review.controller";
import {
  getFindingFix,
  generateFindingFix,
  postGitHubFixSuggestion,
  updateFixStatusHandler,
  listPRFixes,
} from "../controllers/fix.controller";

const router = Router();

router.get("/repositories", getRepositories);
router.get("/repositories/:id", getRepository);
router.get("/pull-requests", getPullRequests);
router.get("/pull-requests/:id", getPullRequest);
router.get("/pull-requests/:id/files", getPullRequestFiles);
router.get("/pull-requests/:id/reviews", getAIReviews);
router.get("/pull-requests/:id/risk-score", getAIRiskScore);
router.post("/pull-requests/:id/review", triggerAIReview);
router.get("/reviews/:prId", getReviewBundle);
router.post("/reviews/:prId/reanalyze", reanalyzeReview);
router.post("/reviews/:prId/share", shareReview);
router.get("/reviews/:prId/export", exportReview);
router.get("/reviews/:prId/stream", streamReviewProgress);
router.patch("/findings/:findingId/interaction", updateFindingInteraction);
router.get("/findings/:findingId/fix", getFindingFix);
router.post("/findings/:findingId/fix/generate", generateFindingFix);
router.post("/findings/:findingId/fix/github-suggestion", postGitHubFixSuggestion);
router.patch("/findings/:findingId/fix/status", updateFixStatusHandler);
router.get("/reviews/:prId/fixes", listPRFixes);
router.get("/webhook-logs", getWebhookLogs);
router.get("/activity-feed", getActivityFeedHandler);
router.get("/metrics", getMetricsController);

export default router;
