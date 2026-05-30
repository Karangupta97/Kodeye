import { getDB } from "../db/supabase";
import { logger } from "../utils/logger";

export interface RiskScoreInput {
  overall_score: number;
  security_score: number;
  performance_score: number;
  maintainability_score: number;
}

export const upsertRiskScore = async (
  prId: string,
  scores: RiskScoreInput
) => {
  const supabase = getDB();

  // Delete existing score for this PR, then insert new one
  await supabase.from("risk_scores").delete().eq("pr_id", prId);

  const { data, error } = await supabase
    .from("risk_scores")
    .insert({
      pr_id: prId,
      ...scores,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to upsert risk score", { error: error.message });
    throw error;
  }

  return data;
};

export const getRiskScoreByPR = async (prId: string) => {
  const supabase = getDB();
  const { data, error } = await supabase
    .from("risk_scores")
    .select("*")
    .eq("pr_id", prId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error("Failed to fetch risk score", { error: error.message });
    throw error;
  }

  return data;
};

export const getRiskScoresForPRs = async (prIds: string[]) => {
  if (!prIds.length) {
    return new Map<string, RiskScoreInput>();
  }

  const supabase = getDB();
  const { data, error } = await supabase
    .from("risk_scores")
    .select("*")
    .in("pr_id", prIds);

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
