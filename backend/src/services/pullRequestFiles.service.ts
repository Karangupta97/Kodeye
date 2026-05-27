import { getDB } from "../db/supabase";
import { logger } from "../utils/logger";

export interface PullRequestFileRecord {
  id?: string;
  pull_request_id: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
  raw_url: string | null;
  blob_url: string | null;
}

export const replacePullRequestFiles = async (
  pullRequestId: string,
  files: PullRequestFileRecord[]
) => {
  const supabase = getDB();

  const { error: deleteError } = await supabase
    .from("pull_request_files")
    .delete()
    .eq("pull_request_id", pullRequestId);

  if (deleteError) {
    logger.error("Failed to clear pull request files", {
      error: deleteError.message,
    });
    throw deleteError;
  }

  if (!files.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("pull_request_files")
    .insert(files)
    .select();

  if (error) {
    logger.error("Failed to insert pull request files", {
      error: error.message,
    });
    throw error;
  }

  return data || [];
};

export const listPullRequestFiles = async (pullRequestId: string) => {
  const supabase = getDB();
  const { data, error } = await supabase
    .from("pull_request_files")
    .select("*")
    .eq("pull_request_id", pullRequestId);

  if (error) {
    logger.error("Failed to list pull request files", { error: error.message });
    throw error;
  }

  return data || [];
};
