-- -----------------------------------------------------------
-- KODEYE AI - GitHub Integration Tables
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_repo_id BIGINT UNIQUE NOT NULL,
  repo_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  owner TEXT NOT NULL,
  installation_id BIGINT NOT NULL,
  private BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT
);

CREATE TABLE IF NOT EXISTS public.pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_pr_id BIGINT UNIQUE NOT NULL,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
  pr_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  branch TEXT NOT NULL,
  author TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pull_request_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id UUID REFERENCES public.pull_requests(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  status TEXT NOT NULL,
  additions INTEGER NOT NULL,
  deletions INTEGER NOT NULL,
  changes INTEGER NOT NULL,
  patch TEXT,
  raw_url TEXT,
  blob_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  action TEXT,
  repository TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repositories_github_repo_id
  ON public.repositories (github_repo_id);

CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_id
  ON public.pull_requests (repo_id);

CREATE INDEX IF NOT EXISTS idx_pull_request_files_pr_id
  ON public.pull_request_files (pull_request_id);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at
  ON public.webhook_logs (created_at DESC);
