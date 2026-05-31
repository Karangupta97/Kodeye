-- -----------------------------------------------------------
-- KODEYE AI — Multi-tenant isolation (user_id + RLS)
-- -----------------------------------------------------------

-- ── repositories.user_id: TEXT (GitHub id) → UUID ─────────
ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS user_id_new UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.repositories r
SET user_id_new = p.id
FROM public.profiles p
WHERE r.user_id_new IS NULL
  AND p.username IS NOT NULL
  AND LOWER(p.username) = LOWER(r.owner);

ALTER TABLE public.repositories DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.repositories RENAME COLUMN user_id_new TO user_id;

CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON public.repositories (user_id);

-- ── pull_requests ─────────────────────────────────────────
ALTER TABLE public.pull_requests
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.pull_requests pr
SET user_id = r.user_id
FROM public.repositories r
WHERE pr.user_id IS NULL AND pr.repo_id = r.id AND r.user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pull_requests_user_id ON public.pull_requests (user_id);

-- ── ai_reviews ──────────────────────────────────────────────
ALTER TABLE public.ai_reviews
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.ai_reviews ar
SET user_id = pr.user_id
FROM public.pull_requests pr
WHERE ar.user_id IS NULL AND ar.pr_id = pr.id AND pr.user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_reviews_user_id ON public.ai_reviews (user_id);

-- ── risk_scores ─────────────────────────────────────────────
ALTER TABLE public.risk_scores
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.risk_scores rs
SET user_id = pr.user_id
FROM public.pull_requests pr
WHERE rs.user_id IS NULL AND rs.pr_id = pr.id AND pr.user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_risk_scores_user_id ON public.risk_scores (user_id);

-- ── review_events ───────────────────────────────────────────
ALTER TABLE public.review_events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.review_events re
SET user_id = pr.user_id
FROM public.pull_requests pr
WHERE re.user_id IS NULL AND re.pr_id = pr.id AND pr.user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_events_user_id ON public.review_events (user_id);

-- ── finding_interactions: TEXT → UUID ───────────────────────
-- Legacy RLS policies (if created manually) block DROP COLUMN user_id.
DROP POLICY IF EXISTS "finding_interactions_tenant_select" ON public.finding_interactions;
DROP POLICY IF EXISTS "finding_interactions_tenant_insert" ON public.finding_interactions;
DROP POLICY IF EXISTS "finding_interactions_tenant_update" ON public.finding_interactions;
DROP POLICY IF EXISTS "finding_interactions_tenant_delete" ON public.finding_interactions;
DROP POLICY IF EXISTS "finding_interactions_select_own" ON public.finding_interactions;
DROP POLICY IF EXISTS "finding_interactions_insert_own" ON public.finding_interactions;

DO $$
BEGIN
  -- Already migrated: user_id is UUID (no user_id_new column).
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'finding_interactions'
      AND column_name = 'user_id'
      AND udt_name = 'uuid'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'finding_interactions'
      AND column_name = 'user_id_new'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'finding_interactions'
      AND column_name = 'user_id_new'
  ) THEN
    ALTER TABLE public.finding_interactions
      ADD COLUMN user_id_new UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  UPDATE public.finding_interactions fi
  SET user_id_new = ar.user_id
  FROM public.ai_reviews ar
  WHERE fi.user_id_new IS NULL
    AND fi.finding_id = ar.id
    AND ar.user_id IS NOT NULL
    AND (
      fi.user_id IS NULL
      OR fi.user_id::text = 'anonymous'
    );

  DELETE FROM public.finding_interactions
  WHERE user_id_new IS NULL;

  ALTER TABLE public.finding_interactions
    DROP CONSTRAINT IF EXISTS finding_interactions_finding_id_user_id_action_key;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'finding_interactions'
      AND column_name = 'user_id'
      AND udt_name <> 'uuid'
  ) THEN
    ALTER TABLE public.finding_interactions DROP COLUMN user_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'finding_interactions'
      AND column_name = 'user_id_new'
  ) THEN
    ALTER TABLE public.finding_interactions RENAME COLUMN user_id_new TO user_id;
  END IF;
END $$;

ALTER TABLE public.finding_interactions
  DROP CONSTRAINT IF EXISTS finding_interactions_finding_id_user_id_action_key;

ALTER TABLE public.finding_interactions
  ADD CONSTRAINT finding_interactions_finding_id_user_id_action_key
  UNIQUE (finding_id, user_id, action);

CREATE INDEX IF NOT EXISTS idx_finding_interactions_user_id
  ON public.finding_interactions (user_id);

-- ── review_fixes ────────────────────────────────────────────
ALTER TABLE public.review_fixes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.review_fixes rf
SET user_id = pr.user_id
FROM public.pull_requests pr
WHERE rf.user_id IS NULL AND rf.pr_id = pr.id AND pr.user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_fixes_user_id ON public.review_fixes (user_id);

-- ── webhook_logs ────────────────────────────────────────────
ALTER TABLE public.webhook_logs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.webhook_logs wl
SET user_id = r.user_id
FROM public.repositories r
WHERE wl.user_id IS NULL
  AND wl.repository IS NOT NULL
  AND LOWER(r.full_name) = LOWER(wl.repository);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON public.webhook_logs (user_id);

-- Orphan rows (no matching profile) keep user_id NULL and are invisible to tenants.

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finding_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_fixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- repositories
DROP POLICY IF EXISTS "repositories_select_own" ON public.repositories;
CREATE POLICY "repositories_select_own" ON public.repositories
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "repositories_insert_own" ON public.repositories;
CREATE POLICY "repositories_insert_own" ON public.repositories
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "repositories_update_own" ON public.repositories;
CREATE POLICY "repositories_update_own" ON public.repositories
  FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "repositories_delete_own" ON public.repositories;
CREATE POLICY "repositories_delete_own" ON public.repositories
  FOR DELETE USING (user_id = auth.uid());

-- pull_requests
DROP POLICY IF EXISTS "pull_requests_select_own" ON public.pull_requests;
CREATE POLICY "pull_requests_select_own" ON public.pull_requests
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "pull_requests_insert_own" ON public.pull_requests;
CREATE POLICY "pull_requests_insert_own" ON public.pull_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "pull_requests_update_own" ON public.pull_requests;
CREATE POLICY "pull_requests_update_own" ON public.pull_requests
  FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "pull_requests_delete_own" ON public.pull_requests;
CREATE POLICY "pull_requests_delete_own" ON public.pull_requests
  FOR DELETE USING (user_id = auth.uid());

-- ai_reviews
DROP POLICY IF EXISTS "ai_reviews_select_own" ON public.ai_reviews;
CREATE POLICY "ai_reviews_select_own" ON public.ai_reviews
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "ai_reviews_insert_own" ON public.ai_reviews;
CREATE POLICY "ai_reviews_insert_own" ON public.ai_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "ai_reviews_delete_own" ON public.ai_reviews;
CREATE POLICY "ai_reviews_delete_own" ON public.ai_reviews
  FOR DELETE USING (user_id = auth.uid());

-- risk_scores
DROP POLICY IF EXISTS "risk_scores_select_own" ON public.risk_scores;
CREATE POLICY "risk_scores_select_own" ON public.risk_scores
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "risk_scores_insert_own" ON public.risk_scores;
CREATE POLICY "risk_scores_insert_own" ON public.risk_scores
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "risk_scores_delete_own" ON public.risk_scores;
CREATE POLICY "risk_scores_delete_own" ON public.risk_scores
  FOR DELETE USING (user_id = auth.uid());

-- review_events
DROP POLICY IF EXISTS "review_events_select_own" ON public.review_events;
CREATE POLICY "review_events_select_own" ON public.review_events
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "review_events_insert_own" ON public.review_events;
CREATE POLICY "review_events_insert_own" ON public.review_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- finding_interactions
DROP POLICY IF EXISTS "finding_interactions_select_own" ON public.finding_interactions;
CREATE POLICY "finding_interactions_select_own" ON public.finding_interactions
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "finding_interactions_insert_own" ON public.finding_interactions;
CREATE POLICY "finding_interactions_insert_own" ON public.finding_interactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- review_fixes
DROP POLICY IF EXISTS "review_fixes_select_own" ON public.review_fixes;
CREATE POLICY "review_fixes_select_own" ON public.review_fixes
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "review_fixes_insert_own" ON public.review_fixes;
CREATE POLICY "review_fixes_insert_own" ON public.review_fixes
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "review_fixes_update_own" ON public.review_fixes;
CREATE POLICY "review_fixes_update_own" ON public.review_fixes
  FOR UPDATE USING (user_id = auth.uid());

-- webhook_logs: no tenant SELECT (service role / backend only)
DROP POLICY IF EXISTS "webhook_logs_select_own" ON public.webhook_logs;
CREATE POLICY "webhook_logs_select_own" ON public.webhook_logs
  FOR SELECT USING (user_id = auth.uid());
