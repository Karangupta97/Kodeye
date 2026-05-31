import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface Metrics {
  repositories: number;
  pullRequests: number;
  webhookEvents: number;
  aiReviews: number;
  criticalIssues: number;
  securityFindings: number;
}

export interface PullRequestRecord {
  id: string;
  title: string;
  pr_number: number;
  branch: string;
  author: string;
  author_avatar_url: string;
  status: string;
  created_at: string;
  repository_name: string | null;
  risk_score: number;
  issue_counts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  ai_review_status: "pending" | "processing" | "completed";
}

export interface RepositoryRecord {
  id: string;
  repo_name: string;
  full_name: string;
  owner: string;
  private: boolean;
  created_at: string;
}

export const queryKeys = {
  metrics: ["metrics"] as const,
  repositories: ["repositories"] as const,
  pullRequests: (sync?: boolean) => ["pull-requests", sync ? "sync" : "list"] as const,
};

export function useMetrics() {
  return useQuery({
    queryKey: queryKeys.metrics,
    queryFn: () => fetchApi<Metrics>("/api/metrics"),
  });
}

export function useRepositories() {
  return useQuery({
    queryKey: queryKeys.repositories,
    queryFn: () => fetchApi<RepositoryRecord[]>("/api/repositories"),
  });
}

export function usePullRequests(options?: { sync?: boolean; enabled?: boolean }) {
  const sync = options?.sync ?? false;
  return useQuery({
    queryKey: queryKeys.pullRequests(sync),
    queryFn: () =>
      fetchApi<PullRequestRecord[]>(
        `/api/pull-requests${sync ? "?sync=1" : ""}`
      ),
    enabled: options?.enabled ?? true,
  });
}
