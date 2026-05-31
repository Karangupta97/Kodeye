import { getServiceDB } from "../db/supabase";
import { logger } from "../utils/logger";

export interface WebhookLogRecord {
  event_type: string;
  action: string | null;
  repository: string | null;
  payload: unknown;
  user_id?: string | null;
}

export const logWebhookEvent = async (log: WebhookLogRecord) => {
  const supabase = getServiceDB();
  const { error } = await supabase.from("webhook_logs").insert(log);

  if (error) {
    logger.error("Failed to log webhook event", { error: error.message });
    throw error;
  }
};

export const listWebhookLogs = async (userId: string, limit = 25) => {
  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("webhook_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Failed to list webhook logs", { error: error.message });
    throw error;
  }

  return data || [];
};
