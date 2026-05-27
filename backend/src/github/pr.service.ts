import { getInstallationOctokit } from "./octokit";

export interface PullRequestIdentifier {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
}

export const getPullRequest = async ({
  installationId,
  owner,
  repo,
  pullNumber,
}: PullRequestIdentifier) => {
  const octokit = getInstallationOctokit(installationId);
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return data;
};

export const getPullRequestFiles = async ({
  installationId,
  owner,
  repo,
  pullNumber,
}: PullRequestIdentifier) => {
  const octokit = getInstallationOctokit(installationId);
  const files = await octokit.paginate(octokit.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return files;
};

export const getPullRequestDiff = async ({
  installationId,
  owner,
  repo,
  pullNumber,
}: PullRequestIdentifier) => {
  const octokit = getInstallationOctokit(installationId);
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner,
      repo,
      pull_number: pullNumber,
      headers: {
        accept: "application/vnd.github.v3.diff",
      },
    }
  );

  return response.data as string;
};
