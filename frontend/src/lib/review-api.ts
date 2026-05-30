import { API_BASE_URL, fetchApi } from "./api";

export interface ReviewAiFix {
  id: string;
  original_code: string;
  suggested_code: string;
  explanation: string;
  why_fix_works?: string;
  confidence: number;
  confidence_percent: number;
  confidence_label: string;
  start_line?: number;
  end_line?: number;
  status?: string;
}

export interface FixSuggestionsStats {
  total_findings: number;
  fixes_generated: number;
  high_confidence: number;
  applied: number;
  rejected: number;
  acceptance_rate: number | null;
  average_confidence: number;
}

export interface ReviewFinding {
  id: string;
  severity: string;
  display_severity?: string;
  category: string;
  file: string;
  line: number;
  issue: string;
  why: string;
  fix: string;
  confidence: number;
  impact?: string;
  reference?: string;
  interactions?: string[];
  ai_fix?: ReviewAiFix | null;
  created_at?: string;
}

export interface ReviewFile {
  id: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
  raw_url: string | null;
  blob_url: string | null;
}

export interface ReviewBundle {
  pull_request: {
    id: string;
    pr_number: number;
    title: string;
    branch: string;
    base_branch: string;
    author: string;
    author_avatar_url: string;
    status: string;
    created_at: string;
    commits_count: number;
    github_url?: string;
    description?: string;
  };
  repository: {
    id: string;
    repo_name: string;
    full_name: string;
    owner: string;
  };
  files: ReviewFile[];
  findings: ReviewFinding[];
  risk_score: {
    overall_score: number;
    security_score: number;
    performance_score: number;
    maintainability_score: number;
    architecture_score: number;
    risk_level: string;
  };
  breakdown: Array<{
    category: string;
    key: string;
    issueCount: number;
    percentage: number;
    severity: string;
  }>;
  severity_counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  category_counts: Array<{ key: string; label: string; count: number }>;
  agents: Array<{
    id: string;
    name: string;
    status: string;
    findingsCount: number;
    executionTimeMs: number;
  }>;
  timeline: Array<{
    id: string;
    label: string;
    detail?: string;
    timestamp?: string;
    status: string;
    event_type?: string;
  }>;
  progress: {
    state: string;
    message: string;
    progress: number;
    agents?: ReviewBundle["agents"];
  };
  ai_review_status: "pending" | "processing" | "completed";
  fix_suggestions?: FixSuggestionsStats;
  fix_records?: Array<
    ReviewAiFix & {
      finding_id: string;
      file_path: string;
      issue_title: string;
      issue_type?: string;
      severity?: string;
    }
  >;
  debug?: {
    pr_id: string;
    findings_count: number;
    fixes_count: number;
    agents_count: number;
    has_risk_score: boolean;
    risk_overall: number;
    review_completed_event: boolean;
    progress_state: string;
  };
}

export interface ReviewFixRecord extends ReviewAiFix {
  finding_id: string;
  file_path: string;
  issue_type?: string;
  severity?: string;
}

export const fetchReviewBundle = (prId: string, debug = false) =>
  fetchApi<ReviewBundle>(`/api/reviews/${prId}${debug ? "?debug=1" : ""}`);

export const reanalyzeReview = (prId: string) =>
  fetch(`${API_BASE_URL}/api/reviews/${prId}/reanalyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

export const shareReview = (prId: string) =>
  fetchApi<{ share_url: string }>(`/api/reviews/${prId}/share`, {
    method: "POST",
  });

export const exportReviewUrl = (prId: string, format: "json" | "markdown" | "pdf") =>
  `${API_BASE_URL}/api/reviews/${prId}/export?format=${format}`;

export const updateFindingInteraction = (
  findingId: string,
  action: string,
  userId?: string
) =>
  fetchApi(`/api/findings/${findingId}/interaction`, {
    method: "PATCH",
    body: JSON.stringify({ action, user_id: userId }),
  });

export const fetchFindingFix = (findingId: string) =>
  fetchApi<ReviewFixRecord>(`/api/findings/${findingId}/fix`);

export const generateFindingFix = (findingId: string, force = false) =>
  fetchApi<ReviewFixRecord>(
    `/api/findings/${findingId}/fix/generate${force ? "?force=1" : ""}`,
    { method: "POST" }
  );

export const postGitHubFixSuggestion = (findingId: string) =>
  fetchApi<{ posted: boolean; comment_id: number; url: string }>(
    `/api/findings/${findingId}/fix/github-suggestion`,
    { method: "POST" }
  );

export const updateFixStatus = (
  findingId: string,
  status: "applied" | "rejected"
) =>
  fetchApi<ReviewFixRecord>(`/api/findings/${findingId}/fix/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const subscribeReviewStream = (
  prId: string,
  onUpdate: (data: ReviewBundle["progress"]) => void
) => {
  const source = new EventSource(
    `${API_BASE_URL}/api/reviews/${prId}/stream`
  );

  source.onmessage = (event) => {
    try {
      onUpdate(JSON.parse(event.data));
    } catch {
      /* ignore parse errors */
    }
  };

  return () => source.close();
};
