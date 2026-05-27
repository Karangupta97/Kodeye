import { getDB } from "../db/supabase";
import { logger } from "../utils/logger";
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
}

export const upsertPullRequest = async (record: PullRequestRecord) => {
  const supabase = getDB();
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

export const listPullRequests = async (repoId?: string) => {
  const supabase = getDB();
  let query = supabase.from("pull_requests").select("*");

  if (repoId) {
    query = query.eq("repo_id", repoId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    logger.error("Failed to list pull requests", { error: error.message });
    throw error;
  }

  return data || [];
};

const mapStatus = (status: string) => {
  if (status === "open" || status === "closed" || status === "merged") {
    return status;
  }
  return "open";
};

export const syncPullRequestsFromGithub = async (repoId?: string) => {
  const repositories = await listRepositories();
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
        await upsertPullRequest({
          github_pr_id: pull.id,
          repo_id: repo.id,
          pr_number: pull.number,
          title: pull.title,
          branch: pull.head?.ref || "",
          author: pull.user?.login || "unknown",
          status: mapStatus(pull.state || "open"),
          created_at: pull.created_at || new Date().toISOString(),
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

export const getPullRequestById = async (id: string) => {
  const supabase = getDB();
  const { data, error } = await supabase
    .from("pull_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    logger.error("Failed to fetch pull request", { error: error.message });
    throw error;
  }

  return data;
};
