import { getPullRequestById } from "../services/pullRequests.service";
import { getRepositoryById } from "../services/repositories.service";
import { logAuthorizationFailure } from "./securityLogger";

export class ResourceNotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "ResourceNotFoundError";
  }
}

export const requirePullRequest = async (prId: string, userId: string) => {
  const pr = await getPullRequestById(prId, userId);
  if (!pr) {
    logAuthorizationFailure({
      userId,
      resource: "pull_request",
      resourceId: prId,
    });
    throw new ResourceNotFoundError();
  }
  return pr;
};

export const requireRepository = async (repoId: string, userId: string) => {
  const repo = await getRepositoryById(repoId, userId);
  if (!repo) {
    logAuthorizationFailure({
      userId,
      resource: "repository",
      resourceId: repoId,
    });
    throw new ResourceNotFoundError();
  }
  return repo;
};
