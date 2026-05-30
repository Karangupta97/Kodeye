import { getDB } from "../db/supabase";
import { getTotalReviewStats } from "./aiReviews.service";

export const getMetrics = async () => {
  const supabase = getDB();

  const [repos, prs, logs, reviewStats] = await Promise.all([
    supabase.from("repositories").select("id", { count: "exact", head: true }),
    supabase
      .from("pull_requests")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("webhook_logs")
      .select("id", { count: "exact", head: true }),
    getTotalReviewStats(),
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
