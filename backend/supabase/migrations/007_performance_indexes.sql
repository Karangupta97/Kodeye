-- Performance indexes for multi-tenant query patterns

CREATE INDEX IF NOT EXISTS idx_ai_reviews_user_pr
  ON public.ai_reviews (user_id, pr_id);

CREATE INDEX IF NOT EXISTS idx_ai_reviews_user_severity
  ON public.ai_reviews (user_id, severity);

CREATE INDEX IF NOT EXISTS idx_ai_reviews_user_category
  ON public.ai_reviews (user_id, category);

CREATE INDEX IF NOT EXISTS idx_risk_scores_user_pr
  ON public.risk_scores (user_id, pr_id);

CREATE INDEX IF NOT EXISTS idx_pull_requests_user_created
  ON public.pull_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pull_requests_user_repo
  ON public.pull_requests (user_id, repo_id);

CREATE INDEX IF NOT EXISTS idx_review_events_pr_created
  ON public.review_events (pr_id, created_at);

CREATE INDEX IF NOT EXISTS idx_finding_interactions_finding
  ON public.finding_interactions (finding_id);
