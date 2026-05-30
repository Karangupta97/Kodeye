import { Router } from "express";
import { getRepositories, getRepository } from "../controllers/repositories.controller";
import {
  getPullRequest,
  getPullRequestFiles,
  getPullRequests,
} from "../controllers/pullRequests.controller";
import { getWebhookLogs } from "../controllers/webhookLogs.controller";
import { getMetricsController } from "../controllers/metrics.controller";
import {
  triggerAIReview,
  getAIReviews,
  getAIRiskScore,
} from "../controllers/aiReview.controller";

const router = Router();

router.get("/repositories", getRepositories);
router.get("/repositories/:id", getRepository);
router.get("/pull-requests", getPullRequests);
router.get("/pull-requests/:id", getPullRequest);
router.get("/pull-requests/:id/files", getPullRequestFiles);
router.get("/pull-requests/:id/reviews", getAIReviews);
router.get("/pull-requests/:id/risk-score", getAIRiskScore);
router.post("/pull-requests/:id/review", triggerAIReview);
router.get("/webhook-logs", getWebhookLogs);
router.get("/metrics", getMetricsController);

export default router;
