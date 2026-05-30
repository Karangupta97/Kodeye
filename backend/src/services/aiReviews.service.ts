import { getDB } from "../db/supabase";
import { logger } from "../utils/logger";

export interface AIReviewRecord {
  severity: string;
  category: string;
  file: string;
  line: number;
  issue: string;
  why: string;
  fix: string;
  confidence: number;
}

export const insertReviews = async (
  prId: string,
  reviews: AIReviewRecord[]
) => {
  if (!reviews.length) {
    return [];
  }

  const supabase = getDB();
  const records = reviews.map((review) => ({
    pr_id: prId,
    ...review,
  }));

  const { data, error } = await supabase
    .from("ai_reviews")
    .insert(records)
    .select();

  if (error) {
    logger.error("Failed to insert AI reviews", { error: error.message });
    throw error;
  }

  return data || [];
};

export const listReviewsByPR = async (prId: string) => {
  const supabase = getDB();
  const { data, error } = await supabase
    .from("ai_reviews")
    .select("*")
    .eq("pr_id", prId)
    .order("severity", { ascending: true })
    .order("confidence", { ascending: false });

  if (error) {
    logger.error("Failed to list AI reviews", { error: error.message });
    throw error;
  }

  return data || [];
};

export const deleteReviewsByPR = async (prId: string) => {
  const supabase = getDB();
  const { error } = await supabase
    .from("ai_reviews")
    .delete()
    .eq("pr_id", prId);

  if (error) {
    logger.error("Failed to delete AI reviews", { error: error.message });
    throw error;
  }
};

export const countReviewsByPR = async (prIds: string[]) => {
  if (!prIds.length) {
    return new Map<string, { total: number; critical: number; warning: number; suggestion: number }>();
  }

  const supabase = getDB();
  const { data, error } = await supabase
    .from("ai_reviews")
    .select("pr_id, severity")
    .in("pr_id", prIds);

  if (error) {
    logger.error("Failed to count AI reviews", { error: error.message });
    throw error;
  }

  const counts = new Map<
    string,
    { total: number; critical: number; warning: number; suggestion: number }
  >();

  for (const id of prIds) {
    counts.set(id, { total: 0, critical: 0, warning: 0, suggestion: 0 });
  }

  for (const row of data || []) {
    const entry = counts.get(row.pr_id);
    if (entry) {
      entry.total++;
      if (row.severity === "critical") entry.critical++;
      else if (row.severity === "warning") entry.warning++;
      else if (row.severity === "suggestion") entry.suggestion++;
    }
  }

  return counts;
};

export const getTotalReviewStats = async () => {
  const supabase = getDB();
  const { data, error } = await supabase
    .from("ai_reviews")
    .select("severity, category");

  if (error) {
    logger.error("Failed to get review stats", { error: error.message });
    return { total: 0, critical: 0, securityFindings: 0 };
  }

  const rows = data || [];
  return {
    total: rows.length,
    critical: rows.filter((r) => r.severity === "critical").length,
    securityFindings: rows.filter((r) => r.category === "security").length,
  };
};
