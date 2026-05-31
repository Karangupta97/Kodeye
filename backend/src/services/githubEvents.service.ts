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
import {
  getPullRequestDiff,
  getPullRequestFiles,
} from "../github/pr.service";
import { getInstallationRepositories } from "../github/installation.service";
import { GitHubRepositoryInfo, GitHubSenderInfo } from "../types/github";
import { isUserPullRequestAuthor } from "../utils/pullRequestAuthor";
import { resolveWebhookUserId } from "./userResolution.service";

const mapRepositoryRecord = (
  repo: GitHubRepositoryInfo,
  installationId: number,
  userId: string | null
): RepositoryRecord => {
  return {
    github_repo_id: repo.id,
    repo_name: repo.name,
    full_name: repo.full_name,
    owner:
      repo.owner?.login ||
      repo.full_name?.split("/")[0] ||
      "",
    installation_id: installationId,
    private: repo.private,
    user_id: userId,
  };
};

const ownerLoginFromRepo = (repo: GitHubRepositoryInfo) =>
  repo.owner?.login || repo.full_name?.split("/")[0] || null;

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
    const userId = await resolveWebhookUserId({
      ownerLogin: ownerLoginFromRepo(repo),
      senderLogin: sender?.login,
    });
    await upsertRepository(
      mapRepositoryRecord(repo, installationId, userId)
    );
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
    const userId = await resolveWebhookUserId({
      ownerLogin: ownerLoginFromRepo(repo),
      senderLogin: sender?.login,
    });
    await upsertRepository(
      mapRepositoryRecord(repo, installationId, userId)
    );
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
  const author = pullRequest.user?.login || "unknown";

  if (!isUserPullRequestAuthor(author)) {
    logger.info("Skipping automated pull request", {
      deliveryId,
      author,
      pullNumber: pullRequest.number,
    });
    return;
  }

  const ownerLogin = ownerLoginFromRepo(repository);
  const userId = await resolveWebhookUserId({
    ownerLogin,
    senderLogin: sender?.login,
  });

  if (!userId) {
    logger.warn("Skipping pull request webhook — no Supabase user for repo", {
      deliveryId,
      ownerLogin,
      sender: sender?.login,
      repository: repository.full_name,
    });
    return;
  }

  const repoRecord = await upsertRepository(
    mapRepositoryRecord(repository, installationId, userId)
  );

  const prRecord = await upsertPullRequest({
    github_pr_id: pullRequest.id,
    repo_id: repoRecord.id,
    pr_number: pullRequest.number,
    title: pullRequest.title,
    branch: pullRequest.head?.ref || "",
    author,
    status: pullRequest.state || "open",
    created_at: pullRequest.created_at || new Date().toISOString(),
    user_id: userId,
  });

  logger.info("Pull request persisted", {
    deliveryId,
    pullRequestId: prRecord.id,
    githubPrId: pullRequest.id,
    repoId: repoRecord.id,
    userId,
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

  logger.info("Pull request event handling complete — awaiting manual AI review trigger", {
    deliveryId,
    pullRequestId: prRecord.id,
    prNumber: pullRequest.number,
  });
};
