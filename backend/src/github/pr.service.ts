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
  const octokit = await getInstallationOctokit(installationId);
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
  const octokit = await getInstallationOctokit(installationId);
  const files = await octokit.paginate(octokit.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return files;
};

export const listOpenPullRequests = async ({
  installationId,
  owner,
  repo,
}: Omit<PullRequestIdentifier, "pullNumber">) => {
  const octokit = await getInstallationOctokit(installationId);
  const pulls = await octokit.paginate(octokit.pulls.list, {
    owner,
    repo,
    state: "all",
    sort: "updated",
    direction: "desc",
    per_page: 50,
  });
  return pulls;
};

export const getPullRequestDiff = async ({
  installationId,
  owner,
  repo,
  pullNumber,
}: PullRequestIdentifier) => {
  const octokit = await getInstallationOctokit(installationId);
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

  return String(response.data);
};
