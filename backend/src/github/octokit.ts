import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { getGithubAppId, getGithubPrivateKey } from "../config/env";

export const getAppOctokit = (): Octokit => {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: getGithubAppId(),
      privateKey: getGithubPrivateKey(),
    },
  });
};

export const getInstallationOctokit = (installationId: number): Octokit => {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: getGithubAppId(),
      privateKey: getGithubPrivateKey(),
      installationId,
    },
  });
};
