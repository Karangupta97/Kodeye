import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};

export const getGeminiApiKey = (): string => {
  return requireEnv("GEMINI_API_KEY");
};

export const getOpenAIApiKey = (): string | null => {
  return process.env.OPENAI_API_KEY || null;
};

export const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const getGithubAppId = (): number => {
  const value = requireEnv("GITHUB_APP_ID");
  const appId = Number(value);
  if (!Number.isFinite(appId)) {
    throw new Error("GITHUB_APP_ID must be a number");
  }
  return appId;
};

export const getGithubPrivateKey = (): string => {
  const raw = requireEnv("GITHUB_PRIVATE_KEY").trim();
  const unquoted =
    raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
  const normalized = unquoted.replace(/\\n/g, "\n");

  if (normalized.includes("-----BEGIN")) {
    try {
      const keyObject = crypto.createPrivateKey(normalized);
      return keyObject
        .export({ type: "pkcs8", format: "pem" })
        .toString()
        .trim();
    } catch {
      // Continue to fallback parsing paths.
    }
  }

  try {
    const decodedBuffer = Buffer.from(normalized, "base64");
    const decodedText = decodedBuffer.toString("utf8").trim();

    if (decodedText.includes("-----BEGIN")) {
      const keyObject = crypto.createPrivateKey(decodedText);
      return keyObject
        .export({ type: "pkcs8", format: "pem" })
        .toString()
        .trim();
    }

    // Try PKCS8 DER first
    try {
      const keyObject = crypto.createPrivateKey({
        key: decodedBuffer,
        format: "der",
        type: "pkcs8",
      });
      return keyObject
        .export({ type: "pkcs8", format: "pem" })
        .toString()
        .trim();
    } catch {
      // Not PKCS8 — try PKCS1 (traditional RSA)
    }

    // Try PKCS1 DER (traditional RSA private key — starts with MIIEpA...)
    try {
      const keyObject = crypto.createPrivateKey({
        key: decodedBuffer,
        format: "der",
        type: "pkcs1",
      });
      return keyObject
        .export({ type: "pkcs8", format: "pem" })
        .toString()
        .trim();
    } catch {
      // Not PKCS1 either
    }

    // Last resort: wrap in PEM header/footer and try
    const pemWrapped = `-----BEGIN RSA PRIVATE KEY-----\n${normalized.match(/.{1,64}/g)?.join("\n")}\n-----END RSA PRIVATE KEY-----`;
    try {
      const keyObject = crypto.createPrivateKey(pemWrapped);
      return keyObject
        .export({ type: "pkcs8", format: "pem" })
        .toString()
        .trim();
    } catch {
      // All strategies failed
    }
  } catch (_error) {
    // outer try failed
  }

  throw new Error(
    "GITHUB_PRIVATE_KEY is invalid. Provide a valid PEM private key, escaped PEM, or base64-encoded PKCS1/PKCS8 key."
  );
};
