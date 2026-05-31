import { getServiceDB } from "../db/supabase";
import { logger } from "../utils/logger";

export interface RiskScoreInput {
  overall_score: number;
  security_score: number;
  performance_score: number;
  maintainability_score: number;
}

export const upsertRiskScore = async (
  prId: string,
  scores: RiskScoreInput,
  userId: string
) => {
  const supabase = getServiceDB();

  const { data, error } = await supabase
    .from("risk_scores")
    .insert({
      pr_id: prId,
      user_id: userId,
      ...scores,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to upsert risk score", { error: error.message });
    throw error;
  }

  const keepId = data.id;
  const { error: pruneError } = await supabase
    .from("risk_scores")
    .delete()
    .eq("pr_id", prId)
    .eq("user_id", userId)
    .neq("id", keepId);

  if (pruneError) {
    logger.error("Failed to prune old risk scores", {
      error: pruneError.message,
    });
    throw pruneError;
  }

  return data;
};

export const getRiskScoreByPR = async (prId: string, userId: string) => {
  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("risk_scores")
    .select("*")
    .eq("pr_id", prId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error("Failed to fetch risk score", { error: error.message });
    throw error;
  }

  return data;
};

export const getRiskScoresForPRs = async (prIds: string[], userId: string) => {
  if (!prIds.length) {
    return new Map<string, RiskScoreInput>();
  }

  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("risk_scores")
    .select("*")
    .in("pr_id", prIds)
    .eq("user_id", userId);

  if (error) {
    logger.error("Failed to fetch risk scores", { error: error.message });
    throw error;
  }

  const scores = new Map<string, RiskScoreInput>();
  for (const row of data || []) {
    scores.set(row.pr_id, {
      overall_score: row.overall_score,
      security_score: row.security_score,
      performance_score: row.performance_score,
      maintainability_score: row.maintainability_score,
    });
  }

  return scores;
};
