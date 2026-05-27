import { getDB } from "../db/supabase";
import { logger } from "../utils/logger";

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
