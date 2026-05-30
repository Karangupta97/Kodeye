-- Review timeline events (persisted)
CREATE TABLE IF NOT EXISTS public.review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID REFERENCES public.pull_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  label TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'done',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_events_pr_id
  ON public.review_events (pr_id, created_at DESC);

-- Finding user interactions
CREATE TABLE IF NOT EXISTS public.finding_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID REFERENCES public.ai_reviews(id) ON DELETE CASCADE,
  user_id TEXT,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (finding_id, user_id, action)
);

CREATE INDEX IF NOT EXISTS idx_finding_interactions_finding
  ON public.finding_interactions (finding_id);
