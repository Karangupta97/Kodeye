import { getGithubAppId, getGithubPrivateKey } from "../config/env";

const OCTOKIT_TTL_MS = 55 * 60 * 1000;
const installationClients = new Map<
  number,
  { client: any; expiresAt: number }
>();

const loadOctokit = async (): Promise<{ Octokit: any; createAppAuth: any }> => {
  const [{ Octokit }, { createAppAuth }] = await Promise.all([
    import("@octokit/rest"),
    import("@octokit/auth-app"),
  ]);

  return { Octokit, createAppAuth };
};

export const getAppOctokit = async (): Promise<any> => {
  const { Octokit, createAppAuth } = await loadOctokit();

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: getGithubAppId(),
      privateKey: getGithubPrivateKey(),
    },
  });
};

export const getInstallationOctokit = async (
  installationId: number
): Promise<any> => {
  const cached = installationClients.get(installationId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.client;
  }

  const { Octokit, createAppAuth } = await loadOctokit();
  const client = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: getGithubAppId(),
      privateKey: getGithubPrivateKey(),
      installationId,
    },
  });

  installationClients.set(installationId, {
    client,
    expiresAt: Date.now() + OCTOKIT_TTL_MS,
  });

  return client;
};
