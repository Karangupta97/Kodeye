import { getServiceDB } from "../db/supabase";
import { logger } from "../utils/logger";

export interface RepositoryRecord {
  id?: string;
  github_repo_id: number;
  repo_name: string;
  full_name: string;
  owner: string;
  installation_id: number;
  private: boolean;
  user_id: string | null;
}

export const upsertRepository = async (repo: RepositoryRecord) => {
  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("repositories")
    .upsert(repo, { onConflict: "github_repo_id" })
    .select()
    .single();

  if (error) {
    logger.error("Failed to upsert repository", { error: error.message });
    throw error;
  }

  return data;
};

export const removeRepositoryByGithubId = async (githubRepoId: number) => {
  const supabase = getServiceDB();
  const { error } = await supabase
    .from("repositories")
    .delete()
    .eq("github_repo_id", githubRepoId);

  if (error) {
    logger.error("Failed to remove repository", { error: error.message });
    throw error;
  }
};

export const listRepositories = async (userId: string) => {
  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("repositories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Failed to list repositories", { error: error.message });
    throw error;
  }

  return data || [];
};

export const getRepositoryById = async (id: string, userId: string) => {
  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("repositories")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("Failed to fetch repository", { error: error.message });
    throw error;
  }

  return data;
};

export const getRepositoryByGithubId = async (githubRepoId: number) => {
  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("repositories")
    .select("*")
    .eq("github_repo_id", githubRepoId)
    .maybeSingle();

  if (error) {
    logger.error("Failed to fetch repository by GitHub id", {
      error: error.message,
    });
    throw error;
  }

  return data;
};
