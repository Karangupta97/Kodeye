import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { logWebhookEvent } from "../services/webhookLogs.service";
import {
  handleInstallationEvent,
  handleInstallationRepositoriesEvent,
  handlePullRequestEvent,
} from "../services/githubEvents.service";

export const handleGithubWebhook = async (req: Request, res: Response) => {
  const eventType = req.header("x-github-event") || "unknown";
  const deliveryId = req.header("x-github-delivery") || "unknown";

  let payload: any;
  try {
    const rawBody = req.body as Buffer;
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch (error) {
    logger.error("Failed to parse GitHub webhook payload", {
      deliveryId,
      error: (error as Error).message,
    });
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  const action = payload.action || null;
  const repository = payload.repository?.full_name || null;

  try {
    await logWebhookEvent({
      event_type: eventType,
      action,
      repository,
      payload,
    });
  } catch (error) {
    logger.error("Failed to store webhook log", {
      deliveryId,
      error: (error as Error).message,
    });
  }

  try {
    switch (eventType) {
      case "installation":
        await handleInstallationEvent(payload);
        break;
      case "installation_repositories":
        await handleInstallationRepositoriesEvent(payload);
        break;
      case "pull_request":
        await handlePullRequestEvent(payload);
        break;
      default:
        logger.info("Unhandled GitHub event", { eventType, action });
    }
  } catch (error) {
    logger.error("Webhook handler failed", {
      deliveryId,
      error: (error as Error).message,
    });
    return res.status(500).json({ error: "Webhook handling failed" });
  }

  return res.status(200).json({ ok: true });
};
