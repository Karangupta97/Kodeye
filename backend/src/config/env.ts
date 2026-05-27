import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
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
  const raw = requireEnv("GITHUB_PRIVATE_KEY");
  return raw.replace(/\\n/g, "\n");
};
