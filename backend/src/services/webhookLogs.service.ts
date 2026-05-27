import { getDB } from "../db/supabase";
import { logger } from "../utils/logger";

export interface WebhookLogRecord {
  event_type: string;
  action: string | null;
  repository: string | null;
  payload: unknown;
}

export const logWebhookEvent = async (log: WebhookLogRecord) => {
  const supabase = getDB();
  const { error } = await supabase.from("webhook_logs").insert(log);

  if (error) {
    logger.error("Failed to log webhook event", { error: error.message });
    throw error;
  }
};

export const listWebhookLogs = async (limit = 25) => {
  const supabase = getDB();
  const { data, error } = await supabase
    .from("webhook_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Failed to list webhook logs", { error: error.message });
    throw error;
  }

  return data || [];
};
