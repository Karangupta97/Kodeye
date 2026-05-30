"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListItemSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Badge } from "@/components/ui/Badge";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import {
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";

interface PullRequestRecord {
  id: string;
  pr_number: number;
  title: string;
  author: string;
  author_avatar_url: string;
  status: string;
  created_at: string;
  risk_score: number;
  ai_review_status: "completed" | "pending";
  issue_counts: { total: number; critical: number };
  repository: { full_name: string } | null;
}

export default function AIReviewsPage() {
  const [pullRequests, setPullRequests] = useState<PullRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await fetchApi<PullRequestRecord[]>("/api/pull-requests");
      setPullRequests(data);
    } catch {
      setPullRequests([]);
      setError("Failed to load AI reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reviewed = pullRequests.filter((pr) => pr.ai_review_status === "completed");
  const pending = pullRequests.filter((pr) => pr.ai_review_status !== "completed");

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <PageHeader
        title="AI Reviews"
        description="Pull requests analyzed by Kodeye's multi-agent review engine."
        actions={
          <Link href="/pull-requests" className="btn-ghost text-sm">
            All pull requests
          </Link>
        }
      />

      <motion.div variants={fadeInUp} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-kd-text-muted">Reviewed</p>
          <p className="text-2xl font-bold text-kd-success mt-1">{reviewed.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-kd-text-muted">Pending</p>
          <p className="text-2xl font-bold text-kd-warning mt-1">{pending.length}</p>
        </div>
        <div className="glass-card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-kd-text-muted">Total PRs</p>
          <p className="text-2xl font-bold text-kd-text mt-1">{pullRequests.length}</p>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp} className="glass-card p-6">
        {loading ? (
          <div className="space-y-4">
            <ListItemSkeleton />
            <ListItemSkeleton />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : pullRequests.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No pull requests yet"
            description="Open a PR in a connected repository to run your first AI review."
            action={
              <Link href="/pull-requests" className="btn-primary text-sm">
                View pull requests
              </Link>
            }
          />
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
                      <p className="text-xs text-kd-text-muted mt-0.5">
                        {pr.repository?.full_name} · #{pr.pr_number}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      pr.ai_review_status === "completed" ? "success" : "warning"
                    }
                  >
                    {pr.ai_review_status === "completed" ? "Reviewed" : "Pending"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-kd-text-muted">
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
                    {new Date(pr.created_at).toLocaleString()}
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
