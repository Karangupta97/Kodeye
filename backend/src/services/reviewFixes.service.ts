import { getServiceDB } from "../db/supabase";
import { logger } from "../utils/logger";

export interface ReviewFixRecord {
  id?: string;
  finding_id: string;
  repository_id?: string | null;
  pr_id: string;
  user_id: string;
  file_path: string;
  start_line: number;
  end_line: number;
  issue_type: string;
  severity: string;
  original_code: string;
  suggested_code: string;
  explanation: string;
  why_fix_works?: string | null;
  confidence: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export const getFixByFindingId = async (findingId: string, userId: string) => {
  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("review_fixes")
    .select("*")
    .eq("finding_id", findingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("Failed to get fix by finding", { error: error.message });
    throw error;
  }

  return data;
};

export const listFixesByPR = async (prId: string, userId: string) => {
  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("review_fixes")
    .select("*")
    .eq("pr_id", prId)
    .eq("user_id", userId)
    .order("confidence", { ascending: false });

  if (error) {
    logger.error("Failed to list fixes by PR", { error: error.message });
    throw error;
  }

  return data || [];
};

export const upsertReviewFix = async (fix: ReviewFixRecord) => {
  const supabase = getServiceDB();

  const { data: existing } = await supabase
    .from("review_fixes")
    .select("id")
    .eq("finding_id", fix.finding_id)
    .eq("user_id", fix.user_id)
    .maybeSingle();

  const row = {
    ...fix,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("review_fixes")
      .update(row)
      .eq("finding_id", fix.finding_id)
      .eq("user_id", fix.user_id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("review_fixes")
    .insert(row)
    .select()
    .single();

  if (error) {
    logger.error("Failed to insert review fix", { error: error.message });
    throw error;
  }

  return data;
};

export const deleteFixesByPR = async (prId: string, userId: string) => {
  const supabase = getServiceDB();
  const { error } = await supabase
    .from("review_fixes")
    .delete()
    .eq("pr_id", prId)
    .eq("user_id", userId);

  if (error) {
    logger.error("Failed to delete fixes by PR", { error: error.message });
    throw error;
  }
};

export const updateFixStatus = async (
  findingId: string,
  userId: string,
  status: "applied" | "rejected" | "suggested"
) => {
  const supabase = getServiceDB();
  const patch: Record<string, string> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "applied") patch.applied_at = new Date().toISOString();
  if (status === "rejected") patch.rejected_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("review_fixes")
    .update(patch)
    .eq("finding_id", findingId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getFixStatsForPR = async (prId: string, userId: string) => {
  const fixes = await listFixesByPR(prId, userId);
  const highConfidence = fixes.filter((f) => f.confidence >= 0.75).length;
  const applied = fixes.filter((f) => f.status === "applied").length;
  const rejected = fixes.filter((f) => f.status === "rejected").length;

  return {
    total: fixes.length,
    high_confidence: highConfidence,
    applied,
    rejected,
    acceptance_rate:
      applied + rejected > 0
        ? Math.round((applied / (applied + rejected)) * 100)
        : null,
    average_confidence:
      fixes.length > 0
        ? Math.round(
            (fixes.reduce((s, f) => s + f.confidence, 0) / fixes.length) * 100
          )
        : 0,
  };
};
