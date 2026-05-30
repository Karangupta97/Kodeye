-- AI-generated code fix suggestions per finding
CREATE TABLE IF NOT EXISTS public.review_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID NOT NULL UNIQUE REFERENCES public.ai_reviews(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES public.repositories(id) ON DELETE SET NULL,
  pr_id UUID NOT NULL REFERENCES public.pull_requests(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  original_code TEXT NOT NULL,
  suggested_code TEXT NOT NULL,
  explanation TEXT NOT NULL,
  why_fix_works TEXT,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'suggested',
  applied_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_fixes_pr_id ON public.review_fixes (pr_id);
CREATE INDEX IF NOT EXISTS idx_review_fixes_finding_id ON public.review_fixes (finding_id);
CREATE INDEX IF NOT EXISTS idx_review_fixes_repository_id ON public.review_fixes (repository_id);
