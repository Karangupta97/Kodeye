-- -----------------------------------------------------------
-- KODEYE AI - AI Review Engine Tables
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID REFERENCES public.pull_requests(id) ON DELETE CASCADE,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  file TEXT NOT NULL,
  line INTEGER NOT NULL,
  issue TEXT NOT NULL,
  why TEXT NOT NULL,
  fix TEXT NOT NULL,
  confidence REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID REFERENCES public.pull_requests(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL,
  security_score INTEGER NOT NULL,
  performance_score INTEGER NOT NULL,
  maintainability_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_reviews_pr_id
  ON public.ai_reviews (pr_id);

CREATE INDEX IF NOT EXISTS idx_ai_reviews_severity
  ON public.ai_reviews (severity);

CREATE INDEX IF NOT EXISTS idx_ai_reviews_category
  ON public.ai_reviews (category);

CREATE INDEX IF NOT EXISTS idx_risk_scores_pr_id
  ON public.risk_scores (pr_id);
