import { getServiceDB } from "../db/supabase";
import { logger } from "../utils/logger";

export interface ReviewEventRecord {
  id?: string;
  pr_id: string;
  user_id: string;
  event_type: string;
  label: string;
  detail?: string | null;
  status: string;
  created_at?: string;
}

export const listReviewEvents = async (prId: string, userId: string) => {
  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("review_events")
    .select("*")
    .eq("pr_id", prId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    logger.warn("review_events table unavailable, using empty timeline", {
      error: error.message,
    });
    return [];
  }

  return data || [];
};

export const appendReviewEvent = async (event: ReviewEventRecord) => {
  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("review_events")
    .insert(event)
    .select()
    .single();

  if (error) {
    logger.warn("Failed to append review event", { error: error.message });
    return null;
  }

  return data;
};

export const seedDefaultTimeline = async (
  prId: string,
  userId: string,
  meta: {
    prNumber: number;
    author: string;
    fileCount: number;
    hasReview: boolean;
    issueCount: number;
    riskScore: number;
  }
) => {
  const existing = await listReviewEvents(prId, userId);
  if (existing.length > 0) {
    return existing;
  }

  const events: ReviewEventRecord[] = [
    {
      pr_id: prId,
      user_id: userId,
      event_type: "webhook_received",
      label: "Webhook Received",
      detail: `PR #${meta.prNumber} synchronized`,
      status: "done",
    },
    {
      pr_id: prId,
      user_id: userId,
      event_type: "files_fetched",
      label: "Files Fetched",
      detail: `${meta.fileCount} file(s) loaded`,
      status: "done",
    },
  ];

  if (meta.hasReview) {
    events.push(
      {
        pr_id: prId,
        user_id: userId,
        event_type: "ai_review_started",
        label: "AI Review Started",
        detail: "Multi-agent analysis initiated",
        status: "done",
      },
      {
        pr_id: prId,
        user_id: userId,
        event_type: "security_complete",
        label: "Security Analysis Complete",
        detail: "Security agent finished",
        status: "done",
      },
      {
        pr_id: prId,
        user_id: userId,
        event_type: "risk_score_generated",
        label: "Risk Score Generated",
        detail: `Overall risk: ${meta.riskScore}/100`,
        status: "done",
      },
      {
        pr_id: prId,
        user_id: userId,
        event_type: "github_comment_posted",
        label: "GitHub Comment Posted",
        detail: "Review comments published to PR",
        status: "done",
      },
      {
        pr_id: prId,
        user_id: userId,
        event_type: "review_completed",
        label: "Review Completed",
        detail: `${meta.issueCount} finding(s) identified`,
        status: "done",
      }
    );
  }

  for (const event of events) {
    await appendReviewEvent(event);
  }

  return listReviewEvents(prId, userId);
};
