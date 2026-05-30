import { getGithubAppId, getGithubPrivateKey } from "../config/env";

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
  const { Octokit, createAppAuth } = await loadOctokit();

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: getGithubAppId(),
      privateKey: getGithubPrivateKey(),
      installationId,
    },
  });
};
