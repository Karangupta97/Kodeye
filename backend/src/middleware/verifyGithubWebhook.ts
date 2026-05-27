import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { requireEnv } from "../config/env";

export const verifyGithubWebhook = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const signature = req.header("x-hub-signature-256");
  if (!signature) {
    return res.status(401).json({ error: "Missing signature" });
  }

  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ error: "Invalid webhook payload" });
  }

  const secret = requireEnv("GITHUB_WEBHOOK_SECRET");
  const rawBody = req.body as Buffer;
  const digest = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;

  const signatureBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);

  if (
    signatureBuffer.length !== digestBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, digestBuffer)
  ) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  return next();
};
