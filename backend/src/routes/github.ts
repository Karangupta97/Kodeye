import { Router } from "express";
import { handleGithubWebhook } from "../controllers/githubWebhook.controller";
import { verifyGithubWebhook } from "../middleware/verifyGithubWebhook";

const router = Router();

router.post("/webhook", verifyGithubWebhook, handleGithubWebhook);

export default router;
