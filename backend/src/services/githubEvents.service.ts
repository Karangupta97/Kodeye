import { getFirstAddedLine } from "../utils/diff";
import { logger } from "../utils/logger";
import {
  upsertRepository,
  removeRepositoryByGithubId,
  RepositoryRecord,
} from "./repositories.service";
import { upsertPullRequest } from "./pullRequests.service";
import {
  replacePullRequestFiles,
  PullRequestFileRecord,
} from "./pullRequestFiles.service";
import { logWebhookEvent } from "./webhookLogs.service";
import { postInlineComment } from "../github/comment.service";
import {
  getPullRequest,
  getPullRequestDiff,
  getPullRequestFiles,
} from "../github/pr.service";
import { getInstallationRepositories } from "../github/installation.service";
import { GitHubRepositoryInfo, GitHubSenderInfo } from "../types/github";

const mapRepositoryRecord = (
  repo: GitHubRepositoryInfo,
  installationId: number,
  sender?: GitHubSenderInfo
): RepositoryRecord => {
  return {
    github_repo_id: repo.id,
    repo_name: repo.name,
    full_name: repo.full_name,
    owner:
      repo.owner?.login ||
      repo.full_name?.split("/")[0] ||
      sender?.login ||
      "",
    installation_id: installationId,
    private: repo.private,
    user_id: sender?.id ? String(sender.id) : null,
  };
};

export const handleInstallationEvent = async (payload: any) => {
  const installationId = payload.installation?.id;
  if (!installationId) {
    logger.warn("Installation event missing installation id");
    return;
  }

  const sender = payload.sender as GitHubSenderInfo | undefined;
  let repositories: GitHubRepositoryInfo[] =
    payload.repositories || payload.repositories_added || [];

  if (!repositories.length) {
    try {
      repositories = await getInstallationRepositories(installationId);
    } catch (error) {
      logger.error("Failed to fetch installation repositories", {
        installationId,
        error: (error as Error).message,
      });
    }
  }

  if (!repositories.length) {
    logger.info("No repositories found for installation", {
      installationId,
    });
    return;
  }

  for (const repo of repositories) {
    await upsertRepository(mapRepositoryRecord(repo, installationId, sender));
  }
};

export const handleInstallationRepositoriesEvent = async (payload: any) => {
  const installationId = payload.installation?.id;
  if (!installationId) {
    logger.warn("Installation repositories event missing installation id");
    return;
  }

  const sender = payload.sender as GitHubSenderInfo | undefined;
  const repositoriesAdded: GitHubRepositoryInfo[] =
    payload.repositories_added || [];
  const repositoriesRemoved: GitHubRepositoryInfo[] =
    payload.repositories_removed || [];

  let repositoriesToUpsert = repositoriesAdded;
  if (!repositoriesToUpsert.length && !repositoriesRemoved.length) {
    try {
      repositoriesToUpsert = await getInstallationRepositories(installationId);
    } catch (error) {
      logger.error("Failed to fetch installation repositories", {
        installationId,
        error: (error as Error).message,
      });
    }
  }

  for (const repo of repositoriesToUpsert) {
    await upsertRepository(mapRepositoryRecord(repo, installationId, sender));
  }

  for (const repo of repositoriesRemoved) {
    await removeRepositoryByGithubId(repo.id);
  }
};

export const handlePullRequestEvent = async (payload: any) => {
  const action = payload.action;
  const supportedActions = ["opened", "synchronize", "reopened"];

  if (!supportedActions.includes(action)) {
    logger.info("Ignoring pull request action", { action });
    return;
  }

  const installationId = payload.installation?.id;
  const repository = payload.repository as GitHubRepositoryInfo;
  const pullRequest = payload.pull_request;
  const deliveryId = payload?.delivery || "n/a";

  logger.info("Processing pull_request webhook", {
    deliveryId,
    action,
    installationId: installationId || null,
    repository: repository?.full_name || null,
    githubPrId: pullRequest?.id || null,
    pullNumber: pullRequest?.number || null,
  });

  if (!installationId || !repository || !pullRequest) {
    logger.warn("Pull request payload missing required fields", {
      deliveryId,
      hasInstallation: Boolean(installationId),
      hasRepository: Boolean(repository),
      hasPullRequest: Boolean(pullRequest),
    });
    return;
  }

  const sender = payload.sender as GitHubSenderInfo | undefined;
  const repoRecord = await upsertRepository(
    mapRepositoryRecord(repository, installationId, sender)
  );

  const prRecord = await upsertPullRequest({
    github_pr_id: pullRequest.id,
    repo_id: repoRecord.id,
    pr_number: pullRequest.number,
    title: pullRequest.title,
    branch: pullRequest.head?.ref || "",
    author: pullRequest.user?.login || "unknown",
    status: pullRequest.state || "open",
    created_at: pullRequest.created_at || new Date().toISOString(),
  });

  logger.info("Pull request persisted", {
    deliveryId,
    pullRequestId: prRecord.id,
    githubPrId: pullRequest.id,
    repoId: repoRecord.id,
  });

  const owner =
    repository.owner?.login || repository.full_name?.split("/")[0] || "";
  const repo = repository.name;

  const files = await getPullRequestFiles({
    installationId,
    owner,
    repo,
    pullNumber: pullRequest.number,
  });

  logger.debug("Fetched pull request files", {
    deliveryId,
    pullNumber: pullRequest.number,
    files: files.length,
  });

  const fileRecords: PullRequestFileRecord[] = files.map((file: any) => ({
    pull_request_id: prRecord.id,
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch || null,
    raw_url: file.raw_url || null,
    blob_url: file.blob_url || null,
  }));

  await replacePullRequestFiles(prRecord.id, fileRecords);
  logger.debug("Stored pull request files", {
    deliveryId,
    pullRequestId: prRecord.id,
    files: fileRecords.length,
  });

  try {
    const diff = await getPullRequestDiff({
      installationId,
      owner,
      repo,
      pullNumber: pullRequest.number,
    });

    logger.debug("Fetched pull request diff", {
      length: diff?.length || 0,
      pullRequest: pullRequest.number,
    });
  } catch (error) {
    logger.error("Failed to fetch pull request diff", {
      error: (error as Error).message,
      pullRequest: pullRequest.number,
    });
  }

  const commentTarget = files.find((file: any) => file.patch);
  if (!commentTarget || !commentTarget.patch) {
    logger.info("No patch found for inline comment");
    return;
  }

  if (!pullRequest.head?.sha) {
    logger.warn("Missing pull request head SHA for inline comment");
    return;
  }

  const firstLine = getFirstAddedLine(commentTarget.patch);
  if (!firstLine || firstLine.newLine === null) {
    logger.info("No added line found for inline comment");
    return;
  }

  const commentBody =
    "Kodeye Test Review\n\nWebhook + PR integration successful.\n\nDetected changed code on this line.";

  try {
    const comment = await postInlineComment({
      installationId,
      owner,
      repo,
      pullNumber: pullRequest.number,
      commitId: pullRequest.head.sha,
      path: commentTarget.filename,
      line: firstLine.newLine,
      body: commentBody,
    });

    await logWebhookEvent({
      event_type: "comment_posted",
      action: "created",
      repository: repository.full_name,
      payload: {
        pull_request: pullRequest.number,
        comment_id: comment.id,
        path: commentTarget.filename,
        line: firstLine.newLine,
        url: comment.html_url,
      },
    });
  } catch (error) {
    logger.error("Failed to post inline comment", {
      error: (error as Error).message,
      pullRequest: pullRequest.number,
    });
  }

  try {
    await getPullRequest({
      installationId,
      owner,
      repo,
      pullNumber: pullRequest.number,
    });
  } catch (error) {
    logger.error("Failed to fetch pull request details", {
      error: (error as Error).message,
      pullRequest: pullRequest.number,
    });
  }
};
