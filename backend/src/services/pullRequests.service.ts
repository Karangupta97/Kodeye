import { getServiceDB } from "../db/supabase";
import { logger } from "../utils/logger";
import { isUserPullRequestAuthor } from "../utils/pullRequestAuthor";
import { listRepositories } from "./repositories.service";
import { listOpenPullRequests } from "../github/pr.service";

export interface PullRequestRecord {
  id?: string;
  github_pr_id: number;
  repo_id: string;
  pr_number: number;
  title: string;
  branch: string;
  author: string;
  status: string;
  created_at: string;
  user_id: string;
}

export const upsertPullRequest = async (record: PullRequestRecord) => {
  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("pull_requests")
    .upsert(record, { onConflict: "github_pr_id" })
    .select()
    .single();

  if (error) {
    logger.error("Failed to upsert pull request", { error: error.message });
    throw error;
  }

  return data;
};

export const listPullRequests = async (userId: string, repoId?: string) => {
  const supabase = getServiceDB();
  let query = supabase.from("pull_requests").select("*").eq("user_id", userId);

  if (repoId) {
    query = query.eq("repo_id", repoId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    logger.error("Failed to list pull requests", { error: error.message });
    throw error;
  }

  const rows = data || [];
  return rows.filter((pr) => isUserPullRequestAuthor(pr.author));
};

const mapStatus = (status: string) => {
  if (status === "open" || status === "closed" || status === "merged") {
    return status;
  }
  return "open";
};

export const syncPullRequestsFromGithub = async (
  userId: string,
  repoId?: string
) => {
  const repositories = await listRepositories(userId);
  const targetRepos = repoId
    ? repositories.filter((repo) => repo.id === repoId)
    : repositories;

  if (!targetRepos.length) {
    return { synced: 0 };
  }

  let synced = 0;

  for (const repo of targetRepos) {
    try {
      const pulls = await listOpenPullRequests({
        installationId: repo.installation_id,
        owner: repo.owner,
        repo: repo.repo_name,
      });

      logger.info("Fetched pull requests from GitHub", {
        repository: repo.full_name,
        installationId: repo.installation_id,
        count: pulls.length,
      });

      for (const pull of pulls) {
        const author = pull.user?.login || "unknown";
        if (!isUserPullRequestAuthor(author)) {
          continue;
        }

        await upsertPullRequest({
          github_pr_id: pull.id,
          repo_id: repo.id,
          pr_number: pull.number,
          title: pull.title,
          branch: pull.head?.ref || "",
          author,
          status: mapStatus(pull.state || "open"),
          created_at: pull.created_at || new Date().toISOString(),
          user_id: userId,
        });
        synced += 1;
      }
    } catch (error) {
      logger.error("Failed to sync pull requests from GitHub", {
        repository: repo.full_name,
        installationId: repo.installation_id,
        error: (error as Error).message,
      });
    }
  }

  return { synced };
};

export const getPullRequestById = async (id: string, userId: string) => {
  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("pull_requests")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("Failed to fetch pull request", { error: error.message });
    throw error;
  }

  return data;
};
