import { getServiceDB } from "../db/supabase";
import { getTotalReviewStats } from "./aiReviews.service";

export const getMetrics = async (userId: string) => {
  const supabase = getServiceDB();

  const [repos, prs, logs, reviewStats] = await Promise.all([
    supabase
      .from("repositories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("pull_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("webhook_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    getTotalReviewStats(userId),
  ]);

  if (repos.error || prs.error || logs.error) {
    throw new Error("Failed to load metrics from Supabase");
  }

  return {
    repositories: repos.count || 0,
    pullRequests: prs.count || 0,
    webhookEvents: logs.count || 0,
    aiReviews: reviewStats.total,
    criticalIssues: reviewStats.critical,
    securityFindings: reviewStats.securityFindings,
  };
};
