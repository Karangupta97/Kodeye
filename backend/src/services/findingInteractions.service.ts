import { getServiceDB } from "../db/supabase";
import { logger } from "../utils/logger";

export type FindingAction =
  | "thumbs_up"
  | "thumbs_down"
  | "mark_fixed"
  | "dismiss";

export const upsertFindingInteraction = async (
  findingId: string,
  action: FindingAction,
  userId: string
) => {
  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("finding_interactions")
    .upsert(
      {
        finding_id: findingId,
        user_id: userId,
        action,
      },
      { onConflict: "finding_id,user_id,action" }
    )
    .select()
    .single();

  if (error) {
    logger.warn("finding_interactions unavailable", { error: error.message });
    return { finding_id: findingId, action, persisted: false };
  }

  return { ...data, persisted: true };
};

export const listInteractionsForFindings = async (
  findingIds: string[],
  userId: string
) => {
  if (!findingIds.length) {
    return new Map<string, string[]>();
  }

  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("finding_interactions")
    .select("finding_id, action")
    .in("finding_id", findingIds)
    .eq("user_id", userId);

  if (error) {
    return new Map<string, string[]>();
  }

  const map = new Map<string, string[]>();
  for (const row of data || []) {
    const list = map.get(row.finding_id) || [];
    list.push(row.action);
    map.set(row.finding_id, list);
  }
  return map;
};
