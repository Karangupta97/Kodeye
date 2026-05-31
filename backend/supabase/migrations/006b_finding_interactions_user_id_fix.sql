-- Repair: run this if 006 failed on finding_interactions DROP COLUMN user_id.
-- Safe to run after a partial 006 apply.

DROP POLICY IF EXISTS "finding_interactions_tenant_select" ON public.finding_interactions;
DROP POLICY IF EXISTS "finding_interactions_tenant_insert" ON public.finding_interactions;
DROP POLICY IF EXISTS "finding_interactions_tenant_update" ON public.finding_interactions;
DROP POLICY IF EXISTS "finding_interactions_tenant_delete" ON public.finding_interactions;
DROP POLICY IF EXISTS "finding_interactions_select_own" ON public.finding_interactions;
DROP POLICY IF EXISTS "finding_interactions_insert_own" ON public.finding_interactions;

DO $$
BEGIN
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

-- Recreate RLS policies (from 006 tail — run rest of 006 after this if not done)
ALTER TABLE public.finding_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finding_interactions_select_own" ON public.finding_interactions;
CREATE POLICY "finding_interactions_select_own" ON public.finding_interactions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "finding_interactions_insert_own" ON public.finding_interactions;
CREATE POLICY "finding_interactions_insert_own" ON public.finding_interactions
  FOR INSERT WITH CHECK (user_id = auth.uid());
