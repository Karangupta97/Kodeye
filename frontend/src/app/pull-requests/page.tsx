"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  GitPullRequest,
  GitBranch,
  ShieldAlert,
  User,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { queryKeys, usePullRequests } from "@/hooks/useApiQueries";

interface RepositoryInfo {
  id: string;
  repo_name: string;
  full_name: string;
}

interface PullRequestRecord {
  id: string;
  pr_number: number;
  title: string;
  branch: string;
  author: string;
  author_avatar_url: string;
  status: string;
  created_at: string;
  risk_score: number;
  issue_counts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  ai_review_status: "completed" | "pending";
  repository: RepositoryInfo | null;
}

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
};

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }
  return new Date(value).toLocaleString();
};

export default function PullRequestsPage() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const { data: pullRequests = [], isLoading, error, refetch } = usePullRequests();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await fetchApi<PullRequestRecord[]>("/api/pull-requests?sync=1");
      queryClient.setQueryData(queryKeys.pullRequests(false), data);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-kd-text">Pull Requests</h1>
          <p className="text-sm text-kd-text-muted mt-1">
            Open PRs from connected repositories with AI review status.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing || isLoading}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {syncing ? "Syncing from GitHub…" : "Sync from GitHub"}
        </button>
      </motion.div>

      <motion.div variants={item} className="glass-card p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-24 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-kd-warning mx-auto mb-3" />
            <p className="text-sm text-kd-text-muted">Failed to load pull requests.</p>
            <button type="button" onClick={() => refetch()} className="btn-ghost text-sm mt-4">
              Retry
            </button>
          </div>
        ) : pullRequests.length === 0 ? (
          <div className="text-center py-12">
            <GitPullRequest className="w-10 h-10 text-kd-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-kd-text">No pull requests yet</p>
            <p className="text-xs text-kd-text-muted mt-2 max-w-sm mx-auto">
              Sync from GitHub or open a PR in a connected repository.
            </p>
            <button type="button" onClick={handleSync} className="btn-primary text-sm mt-4">
              Sync from GitHub
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pullRequests.map((pr) => (
              <article
                key={pr.id}
                className="rounded-xl border border-kd-border bg-kd-bg/40 p-5 hover:border-kd-primary/30 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    <img
                      src={pr.author_avatar_url}
                      alt=""
                      className="w-9 h-9 rounded-full border border-kd-border shrink-0"
                    />
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-kd-text truncate">
                        {pr.title}
                      </h2>
                      <p className="text-xs text-kd-text-muted mt-0.5 flex items-center gap-2">
                        <GitBranch className="w-3 h-3" />
                        {pr.branch}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      pr.ai_review_status === "completed"
                        ? "border-kd-success/30 text-kd-success bg-kd-success/10"
                        : "border-kd-warning/30 text-kd-warning bg-kd-warning/10"
                    }`}
                  >
                    {pr.ai_review_status === "completed" ? "Reviewed" : "Pending"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-kd-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {pr.author}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Risk {pr.risk_score}
                  </span>
                  <span>{pr.issue_counts.total} findings</span>
                  {pr.issue_counts.critical > 0 && (
                    <span className="text-kd-critical">
                      {pr.issue_counts.critical} critical
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-kd-text-muted">
                    {formatTimestamp(pr.created_at)}
                  </span>
                  <Link
                    href={`/reviews/${pr.id}`}
                    className="inline-flex items-center gap-1 text-sm text-kd-glow hover:text-kd-accent font-medium"
                  >
                    Open review
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
