"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi, API_BASE_URL } from "@/lib/api";
import {
  ArrowLeft,
  FileText,
  GitBranch,
  Zap,
  Shield,
  Bug,
  Palette,
  Filter,
} from "lucide-react";
import RiskScoreRing from "@/components/review/RiskScoreRing";
import FindingCard from "@/components/review/FindingCard";
import DiffViewer from "@/components/review/DiffViewer";
import ReviewTimeline from "@/components/review/ReviewTimeline";
import ReviewProcessing from "@/components/review/ReviewProcessing";
import SeverityBadge from "@/components/review/SeverityBadge";

interface RepositoryInfo {
  id: string;
  full_name: string;
  repo_name: string;
}

interface PullRequestFile {
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

interface AIReview {
  id: string;
  severity: string;
  category: string;
  file: string;
  line: number;
  issue: string;
  why: string;
  fix: string;
  confidence: number;
  created_at: string;
}

interface RiskScoreDetail {
  overall_score: number;
  security_score: number;
  performance_score: number;
  maintainability_score: number;
}

interface PullRequestDetail {
  id: string;
  pr_number: number;
  title: string;
  branch: string;
  author: string;
  author_avatar_url: string;
  status: string;
  created_at: string;
  repository: RepositoryInfo | null;
  risk_score: number;
  ai_review_status: string;
  files: PullRequestFile[];
  reviews: AIReview[];
  risk_score_detail: RiskScoreDetail | null;
}

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }
  return new Date(value).toLocaleString();
};

const categoryFilters = [
  { key: "all", label: "All", icon: Filter },
  { key: "security", label: "Security", icon: Shield },
  { key: "bug", label: "Bugs", icon: Bug },
  { key: "performance", label: "Performance", icon: Zap },
  { key: "style", label: "Quality", icon: Palette },
];

export default function PullRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<PullRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"findings" | "diff">("findings");

  const loadData = async () => {
    try {
      const data = await fetchApi<PullRequestDetail>(
        `/api/pull-requests/${params.id}`
      );
      setDetail({
        ...data,
        files: data.files || [],
        reviews: data.reviews || [],
      });
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const startReview = async () => {
    setIsReviewing(true);
    try {
      await fetch(`${API_BASE_URL}/api/pull-requests/${params.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      await loadData();
    } catch (err) {
      console.error("Failed to start AI review", err);
    } finally {
      setIsReviewing(false);
    }
  };

  const stats = useMemo(() => {
    if (!detail) {
      return { additions: 0, deletions: 0, changes: 0 };
    }
    return detail.files.reduce(
      (acc, file) => {
        acc.additions += file.additions;
        acc.deletions += file.deletions;
        acc.changes += file.changes;
        return acc;
      },
      { additions: 0, deletions: 0, changes: 0 }
    );
  }, [detail]);

  const filteredReviews = useMemo(() => {
    if (!detail) return [];
    if (activeFilter === "all") return detail.reviews;
    return detail.reviews.filter((r) => r.category === activeFilter);
  }, [detail, activeFilter]);

  const riskScores = detail?.risk_score_detail;
  const hasReviews = detail && detail.reviews.length > 0;

  const timelineEvents = useMemo(() => {
    if (!detail) return [];
    const events = [
      {
        id: "pr-opened",
        label: "Pull request opened",
        detail: `PR #${detail.pr_number} by ${detail.author}`,
        timestamp: formatTimestamp(detail.created_at),
        status: "done" as const,
        icon: "📋",
      },
      {
        id: "files-synced",
        label: "Files synced",
        detail: `${detail.files.length} file(s) fetched`,
        status: "done" as const,
        icon: "📁",
      },
    ];

    if (hasReviews) {
      events.push(
        {
          id: "ai-review",
          label: "AI review completed",
          detail: `${detail.reviews.length} issue(s) found`,
          status: "done" as const,
          icon: "🤖",
        },
        {
          id: "risk-score",
          label: "Risk score calculated",
          detail: `Score: ${detail.risk_score}/100`,
          status: "done" as const,
          icon: "📊",
        },
        {
          id: "comments-posted",
          label: "GitHub comments posted",
          detail: "Inline review comments added to PR",
          status: "done" as const,
          icon: "💬",
        }
      );
    } else {
      events.push({
        id: "awaiting-review",
        label: "Awaiting AI review",
        detail: "Click 'Start AI Review' to analyze",
        status: "pending" as const,
        icon: "⏳",
      });
    }

    return events;
  }, [detail, hasReviews]);

  if (loading) {
    return (
      <div className="glass-card p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 text-kd-text-muted">
          <div className="spinner" />
          <span>Loading pull request...</span>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="glass-card p-6 max-w-6xl mx-auto text-kd-text-muted">
        Pull request not found.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link
            href="/pull-requests"
            className="inline-flex items-center gap-2 text-xs text-kd-text-muted hover:text-kd-text"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to pull requests
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <img
              src={detail.author_avatar_url}
              alt={detail.author}
              className="w-10 h-10 rounded-full border border-kd-border"
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-kd-text">
                {detail.title}
              </h1>
              <p className="text-sm text-kd-text-muted mt-0.5">
                {detail.repository?.full_name || "Unknown repository"} · PR #{detail.pr_number} · by {detail.author}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!hasReviews && !isReviewing && (
            <button
              type="button"
              onClick={startReview}
              className="btn-primary text-sm"
            >
              <Zap className="w-4 h-4" />
              Start AI Review
            </button>
          )}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-kd-border text-kd-text-muted">
            {detail.status}
          </span>
        </div>
      </div>

      {/* ── Processing Overlay ─────────────────────────── */}
      <AnimatePresence>
        {isReviewing && <ReviewProcessing isProcessing={isReviewing} />}
      </AnimatePresence>

      {/* ── PR Info Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-kd-text-muted">Branch</p>
          <p className="text-sm font-semibold text-kd-text mt-1 flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            {detail.branch}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-kd-text-muted">Additions</p>
          <p className="text-sm font-semibold text-kd-success mt-1">+{stats.additions}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-kd-text-muted">Deletions</p>
          <p className="text-sm font-semibold text-kd-critical mt-1">-{stats.deletions}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-kd-text-muted">Files Changed</p>
          <p className="text-sm font-semibold text-kd-text mt-1">{detail.files.length}</p>
        </div>
      </div>

      {/* ── Risk Scores Section ────────────────────────── */}
      {riskScores && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-kd-text mb-5">Risk Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ring */}
            <div className="flex items-center justify-center">
              <RiskScoreRing score={riskScores.overall_score} size={160} />
            </div>

            {/* Category breakdown */}
            <div className="space-y-4">
              {[
                { label: "Security", score: riskScores.security_score, color: "var(--kd-critical)", icon: "🔒" },
                { label: "Performance", score: riskScores.performance_score, color: "#F97316", icon: "⚡" },
                { label: "Maintainability", score: riskScores.maintainability_score, color: "var(--kd-accent)", icon: "🎨" },
              ].map((cat) => (
                <div key={cat.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-kd-text flex items-center gap-1.5">
                      <span>{cat.icon}</span>
                      {cat.label}
                    </span>
                    <span className="text-xs font-bold" style={{ color: cat.color }}>
                      {cat.score}/100
                    </span>
                  </div>
                  <div className="risk-bar">
                    <motion.div
                      className="risk-bar-fill"
                      style={{ background: cat.color }}
                      initial={{ width: "0%" }}
                      animate={{ width: `${cat.score}%` }}
                      transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Tabs ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-kd-border pb-0">
        {[
          { key: "findings" as const, label: `Findings (${detail.reviews.length})`, icon: Shield },
          { key: "diff" as const, label: `File Diffs (${detail.files.length})`, icon: FileText },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-kd-glow text-kd-glow"
                : "border-transparent text-kd-text-muted hover:text-kd-text"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Findings Tab ───────────────────────────────── */}
      {activeTab === "findings" && (
        <div className="space-y-4">
          {/* Category filters */}
          {detail.reviews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categoryFilters.map((filter) => {
                const count =
                  filter.key === "all"
                    ? detail.reviews.length
                    : detail.reviews.filter((r) => r.category === filter.key).length;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`filter-btn ${activeFilter === filter.key ? "filter-btn-active" : ""}`}
                  >
                    <filter.icon className="w-3 h-3" />
                    {filter.label}
                    <span className="text-[10px] opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Finding cards */}
          {filteredReviews.length === 0 ? (
            <div className="glass-card p-8 text-center">
              {detail.reviews.length === 0 ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-kd-primary/10 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-kd-primary" />
                  </div>
                  <p className="text-sm font-medium text-kd-text">No AI review yet</p>
                  <p className="text-xs text-kd-text-muted">
                    Click &quot;Start AI Review&quot; to analyze this pull request.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-kd-text-muted">
                  No findings in this category.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map((review, idx) => (
                <FindingCard
                  key={review.id}
                  severity={review.severity}
                  category={review.category}
                  file={review.file}
                  line={review.line}
                  issue={review.issue}
                  why={review.why}
                  fix={review.fix}
                  confidence={review.confidence}
                  index={idx}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Diff Tab ───────────────────────────────────── */}
      {activeTab === "diff" && (
        <div className="space-y-4">
          {detail.files.length === 0 ? (
            <p className="text-sm text-kd-text-muted glass-card p-6">
              No file data stored for this pull request.
            </p>
          ) : (
            detail.files.map((file) => {
              const fileComments = detail.reviews
                .filter((r) => r.file === file.filename)
                .map((r) => ({
                  line: r.line,
                  severity: r.severity,
                  issue: r.issue,
                }));

              return file.patch ? (
                <DiffViewer
                  key={file.id}
                  filename={file.filename}
                  patch={file.patch}
                  comments={fileComments}
                />
              ) : (
                <div
                  key={file.id}
                  className="rounded-xl border border-kd-border bg-kd-bg/40 p-4"
                >
                  <p className="text-sm font-semibold text-kd-text">{file.filename}</p>
                  <p className="text-xs text-kd-text-muted mt-1">
                    {file.status} · +{file.additions} / -{file.deletions} · Binary or large file
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Review Timeline ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-semibold text-kd-text mb-4">Review Timeline</h2>
        <ReviewTimeline events={timelineEvents} />
      </motion.div>
    </motion.div>
  );
}
