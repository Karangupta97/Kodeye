"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchApi, API_BASE_URL } from "@/lib/api";
import {
  AlertTriangle,
  ArrowUpRight,
  GitPullRequest,
  GitBranch,
  ShieldAlert,
  User,
  Zap,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";

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
  risk_scores: {
    overall: number;
    security: number;
    performance: number;
    maintainability: number;
  } | null;
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

const getRiskColor = (score: number): string => {
  if (score >= 81) return "var(--kd-critical)";
  if (score >= 61) return "#F97316";
  if (score >= 31) return "var(--kd-warning)";
  return "var(--kd-success)";
};

const getRiskLabel = (score: number): string => {
  if (score >= 81) return "Critical";
  if (score >= 61) return "High";
  if (score >= 31) return "Medium";
  return "Low";
};

export default function PullRequestsPage() {
  const [pullRequests, setPullRequests] = useState<PullRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reviewingPR, setReviewingPR] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadRequest, setReloadRequest] = useState({
    token: 0,
    forceSync: false,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setError(null);
        if (reloadRequest.forceSync) {
          setSyncing(true);
        }
        const data = await fetchApi<PullRequestRecord[]>(
          reloadRequest.forceSync
            ? "/api/pull-requests?sync=1"
            : "/api/pull-requests",
          {},
          (payload): payload is PullRequestRecord[] => Array.isArray(payload)
        );
        if (active) {
          setPullRequests(data);
        }
      } catch (err) {
        if (active) {
          setPullRequests([]);
          setError("Failed to load pull requests. Please try again.");
        }
      } finally {
        if (active) {
          setLoading(false);
          setSyncing(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [reloadRequest]);

  const startReview = async (prId: string) => {
    setReviewingPR(prId);
    try {
      await fetch(`${API_BASE_URL}/api/pull-requests/${prId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      // Reload PR list after review
      setReloadRequest((prev) => ({ token: prev.token + 1, forceSync: false }));
    } catch (err) {
      console.error("Failed to start AI review", err);
    } finally {
      setReviewingPR(null);
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-6"
    >
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-kd-text">
            Pull Requests
          </h1>
          <p className="text-sm text-kd-text-muted mt-1">
            AI-powered code review for your pull requests.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setReloadRequest((value) => ({
              token: value.token + 1,
              forceSync: true,
            }));
          }}
          disabled={loading || syncing}
          className="btn-ghost text-xs disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {syncing ? "Syncing..." : "Sync latest from GitHub"}
        </button>
      </motion.div>

      <motion.div variants={item} className="glass-card p-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="rounded-xl border border-kd-border bg-kd-bg/40 p-5 animate-pulse"
              >
                <div className="h-4 w-2/3 bg-kd-border/60 rounded" />
                <div className="h-3 w-1/3 bg-kd-border/60 rounded mt-3" />
                <div className="h-3 w-full bg-kd-border/60 rounded mt-6" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-kd-critical/40 bg-kd-critical/10 p-4 text-sm text-kd-text space-y-3">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setReloadRequest((value) => ({
                  token: value.token + 1,
                  forceSync: false,
                }));
              }}
              className="btn-ghost text-xs"
            >
              Retry
            </button>
          </div>
        ) : pullRequests.length === 0 ? (
          <div className="rounded-xl border border-kd-border bg-kd-bg/40 p-4 text-sm text-kd-text-muted">
            No pull requests found yet. Open or sync a PR in GitHub, then refresh.
          </div>
        ) : (
          <div className="space-y-4">
            {pullRequests.map((pullRequest) => {
              const riskColor = getRiskColor(pullRequest.risk_score);
              const riskLabel = getRiskLabel(pullRequest.risk_score);
              const isReviewing = reviewingPR === pullRequest.id;

              return (
                <motion.div
                  key={pullRequest.id}
                  layout
                  className="rounded-xl border border-kd-border bg-kd-bg/40 p-5 hover:border-kd-primary/30 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={pullRequest.author_avatar_url}
                        alt={pullRequest.author}
                        className="w-8 h-8 rounded-full border border-kd-border"
                      />
                      <div>
                        <p className="text-lg font-semibold text-kd-text">
                          {pullRequest.title}
                        </p>
                        <p className="text-xs text-kd-text-muted mt-1">
                          {pullRequest.repository?.full_name || "Unknown repo"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Risk Score Badge */}
                      {pullRequest.ai_review_status === "completed" && (
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full border"
                          style={{
                            color: riskColor,
                            borderColor: `color-mix(in srgb, ${riskColor} 40%, transparent)`,
                            background: `color-mix(in srgb, ${riskColor} 10%, transparent)`,
                          }}
                        >
                          {pullRequest.risk_score} {riskLabel}
                        </span>
                      )}
                      {/* Status */}
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-kd-border text-kd-text-muted">
                        {pullRequest.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs text-kd-text-muted">
                    <span className="flex items-center gap-1">
                      <GitPullRequest className="w-3 h-3" />
                      PR #{pullRequest.pr_number}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {pullRequest.branch}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {pullRequest.author}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3 text-xs">
                    <span
                      className="inline-flex items-center gap-1"
                      style={{ color: riskColor }}
                    >
                      <ShieldAlert className="w-3 h-3" />
                      Risk: {pullRequest.risk_score}
                    </span>
                    {pullRequest.issue_counts.critical > 0 && (
                      <span className="inline-flex items-center gap-1 text-kd-critical">
                        <AlertTriangle className="w-3 h-3" />
                        {pullRequest.issue_counts.critical} Critical
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-kd-text-muted">
                      <AlertTriangle className="w-3 h-3" />
                      {pullRequest.issue_counts.total} Issues
                    </span>
                    <span className="inline-flex items-center gap-1 text-kd-text-muted">
                      {pullRequest.ai_review_status === "completed" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-kd-success" />
                          <span className="text-kd-success">Reviewed</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          Pending
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-4 text-xs text-kd-text-muted">
                    <span>Updated {formatTimestamp(pullRequest.created_at)}</span>
                    <div className="flex items-center gap-3">
                      {pullRequest.ai_review_status === "pending" && (
                        <button
                          type="button"
                          onClick={() => startReview(pullRequest.id)}
                          disabled={isReviewing}
                          className="inline-flex items-center gap-1.5 text-kd-glow hover:text-kd-primary transition-colors disabled:opacity-60"
                        >
                          {isReviewing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          {isReviewing ? "Reviewing..." : "Start Review"}
                        </button>
                      )}
                      <Link
                        href={`/pull-requests/${pullRequest.id}`}
                        className="inline-flex items-center gap-1 text-kd-accent hover:text-kd-glow transition-colors"
                      >
                        View details
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
