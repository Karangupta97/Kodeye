import { getInstallationOctokit } from "./octokit";

export interface InlineCommentInput {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
  commitId: string;
  path: string;
  line: number;
  body: string;
}

export const postInlineComment = async ({
  installationId,
  owner,
  repo,
  pullNumber,
  commitId,
  path,
  line,
  body,
}: InlineCommentInput) => {
  const octokit = getInstallationOctokit(installationId);
  const response = await octokit.pulls.createReviewComment({
    owner,
    repo,
    pull_number: pullNumber,
    commit_id: commitId,
    path,
    line,
    side: "RIGHT",
    body,
  });

  return response.data;
};
