import { getInstallationOctokit } from "./octokit";
import { GitHubRepositoryInfo } from "../types/github";

export const getInstallationRepositories = async (
  installationId: number
): Promise<GitHubRepositoryInfo[]> => {
  const octokit = getInstallationOctokit(installationId);
  const repositories = await octokit.paginate(
    octokit.apps.listReposAccessibleToInstallation,
    { per_page: 100 }
  );

  return repositories as GitHubRepositoryInfo[];
};
