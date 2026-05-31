"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useMetrics, useRepositories } from "@/hooks/useApiQueries";
import {
  fetchActivityFeed,
  type ActivityFeedItem,
} from "@/lib/activity-feed";
import {
  GitBranch,
  Shield,
  Activity,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Bug,
  GitPullRequest,
  MessageSquare,
  RefreshCw,
  Settings,
  Package,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
};

interface Metrics {
  repositories: number;
  pullRequests: number;
  webhookEvents: number;
  aiReviews: number;
  criticalIssues: number;
  securityFindings: number;
}

const renderActivityIcon = (iconStr?: string) => {
  switch (iconStr) {
    case "🤖":
      return <Sparkles className="w-5 h-5" />;
    case "💬":
      return <MessageSquare className="w-5 h-5" />;
    case "🔀":
      return <GitPullRequest className="w-5 h-5" />;
    case "✅":
      return <CheckCircle2 className="w-5 h-5" />;
    case "🔄":
      return <RefreshCw className="w-5 h-5" />;
    case "⚙️":
    case "⚙":
      return <Settings className="w-5 h-5" />;
    case "📦":
      return <Package className="w-5 h-5" />;
    case "⬆️":
    case "⬆":
      return <ArrowUpRight className="w-5 h-5" />;
    case "✨":
      return <Sparkles className="w-5 h-5" />;
    default:
      return <Activity className="w-5 h-5" />;
  }
};

interface RepositorySummary {
  id: string;
  repo_name: string;
  full_name: string;
  private: boolean;
  created_at?: string;
}

const STAT_ACCENTS = {
  repositories: {
    bg: "rgba(124, 58, 237, 0.15)",
    color: "#9d5ff5",
  },
  security: {
    bg: "rgba(239, 68, 68, 0.12)",
    color: "#ef4444",
  },
  prs: {
    bg: "rgba(34, 197, 94, 0.12)",
    color: "#22c55e",
  },
  issues: {
    bg: "rgba(245, 158, 11, 0.12)",
    color: "#f59e0b",
  },
} as const;

type DeltaVariant = "positive" | "negative" | "neutral" | "amber";

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaVariant = "neutral",
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delta?: string;
  deltaVariant?: DeltaVariant;
  accent: (typeof STAT_ACCENTS)[keyof typeof STAT_ACCENTS];
}) {
  return (
    <motion.div variants={item} className="stat-card">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: accent.bg }}
      >
        <Icon className="w-5 h-5" style={{ color: accent.color }} aria-hidden />
      </div>
      <p className="text-2xl font-bold text-kd-text tracking-tight">{value}</p>
      <p className="text-sm text-kd-text-muted mt-1">{label}</p>
      {delta && (
        <p className={`stat-card-delta stat-card-delta--${deltaVariant}`}>
          {delta}
        </p>
      )}
    </motion.div>
  );
}

function LiveActivityFeed({
  items,
  groupHeader,
  loading,
}: {
  items: ActivityFeedItem[];
  groupHeader: string | null;
  loading: boolean;
}) {
  if (loading && items.length === 0) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shimmer h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-kd-text-muted">
        No activity yet. Connect a repo, open a PR, or run an AI review to see
        live events from GitHub and Kodeye.
      </p>
    );
  }

  return (
    <div className="overview-activity-feed">
      {groupHeader && (
        <p className="overview-activity-group">{groupHeader}</p>
      )}
      <div className="space-y-2">
        {items.map((entry) => (
          <div key={entry.id} className="overview-activity-item">
            <span
              className={`overview-activity-dot overview-activity-dot--${entry.dotColor}`}
              aria-hidden
            />
            <span className="text-lg leading-none shrink-0" aria-hidden>
              {renderActivityIcon(entry.icon)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-kd-text leading-snug">
                {entry.title}
              </p>
              <p className="text-xs text-kd-text-muted truncate mt-0.5">
                {entry.subtitle}
              </p>
            </div>
            <span className="text-[11px] text-kd-text-muted shrink-0 tabular-nums">
              {entry.relativeTime}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const formatTimestamp = (value?: string | null) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
};

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { data: metrics = null, isLoading: loadingMetrics } = useMetrics();
  const { data: repositories = [], isLoading: loadingRepos } = useRepositories();
  const [activityItems, setActivityItems] = useState<ActivityFeedItem[]>([]);
  const [activityGroupHeader, setActivityGroupHeader] = useState<string | null>(
    null
  );
  const [loadingActivity, setLoadingActivity] = useState(true);
  const loadingData = loadingMetrics || loadingRepos;

  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;
  const installUrl = appSlug
    ? `https://github.com/apps/${appSlug}/installations/new`
    : null;

  const displayName =
    profile?.username ||
    user?.user_metadata?.user_name ||
    user?.email?.split("@")[0] ||
    "Developer";

  const avatarUrl =
    profile?.avatar_url || user?.user_metadata?.avatar_url;

  const loadActivity = async (active: { current: boolean }) => {
    try {
      const feed = await fetchActivityFeed(30);
      if (!active.current) return;
      setActivityItems(feed.items);
      setActivityGroupHeader(feed.groupHeader);
    } catch {
      if (!active.current) return;
      setActivityItems([]);
      setActivityGroupHeader(null);
    } finally {
      if (active.current) setLoadingActivity(false);
    }
  };

  useEffect(() => {
    const active = { current: true };

    loadActivity(active);

    const interval = setInterval(() => loadActivity(active), 30_000);

    return () => {
      active.current = false;
      clearInterval(interval);
    };
  }, []);

  const statDeltas = useMemo(() => {
    if (!metrics) {
      return {
        repos: { text: "—", variant: "neutral" as DeltaVariant },
        security: { text: "—", variant: "neutral" as DeltaVariant },
        prs: { text: "—", variant: "neutral" as DeltaVariant },
        issues: { text: "—", variant: "neutral" as DeltaVariant },
      };
    }

    const repoDelta =
      metrics.repositories > 0
        ? `↑ ${metrics.repositories} connected`
        : "Connect your first repo";

    const securityDelta =
      metrics.criticalIssues > 0
        ? `${metrics.criticalIssues} unresolved critical`
        : metrics.securityFindings > 0
          ? `${metrics.securityFindings} to review`
          : "No open critical issues";

    const prDelta =
      metrics.pullRequests > 0
        ? `↑ ${metrics.pullRequests} in workspace`
        : "Awaiting first PR";

    const issuesDelta =
      metrics.aiReviews > 0
        ? `${metrics.aiReviews} findings logged`
        : "Clean slate";

    return {
      repos: {
        text: repoDelta,
        variant: (metrics.repositories > 0 ? "positive" : "neutral") as DeltaVariant,
      },
      security: {
        text: securityDelta,
        variant: (metrics.criticalIssues > 0
          ? "negative"
          : metrics.securityFindings > 0
            ? "amber"
            : "positive") as DeltaVariant,
      },
      prs: {
        text: prDelta,
        variant: (metrics.pullRequests > 0 ? "positive" : "neutral") as DeltaVariant,
      },
      issues: {
        text: issuesDelta,
        variant: (metrics.aiReviews > 0 ? "amber" : "positive") as DeltaVariant,
      },
    };
  }, [metrics]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-8"
    >
      <motion.div variants={item} className="flex items-center gap-4 sm:gap-5">
        {avatarUrl ? (
          <div className="avatar-ring">
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full"
            />
          </div>
        ) : (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-kd-primary to-kd-glow flex items-center justify-center text-white text-xl font-bold">
            {displayName[0].toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-kd-text tracking-tight">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-kd-primary to-kd-glow bg-clip-text text-transparent">
              {displayName}
            </span>
          </h1>
          <p className="text-kd-text-muted text-sm sm:text-base mt-0.5">
            Here&apos;s an overview of your AI code review activity.
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={container}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={GitBranch}
          label="Repositories"
          value={metrics ? String(metrics.repositories ?? 0) : "—"}
          delta={statDeltas.repos.text}
          deltaVariant={statDeltas.repos.variant}
          accent={STAT_ACCENTS.repositories}
        />
        <StatCard
          icon={Shield}
          label="Security Findings"
          value={metrics ? String(metrics.securityFindings ?? 0) : "—"}
          delta={statDeltas.security.text}
          deltaVariant={statDeltas.security.variant}
          accent={STAT_ACCENTS.security}
        />
        <StatCard
          icon={Activity}
          label="PRs Reviewed"
          value={metrics ? String(metrics.pullRequests ?? 0) : "—"}
          delta={statDeltas.prs.text}
          deltaVariant={statDeltas.prs.variant}
          accent={STAT_ACCENTS.prs}
        />
        <StatCard
          icon={Bug}
          label="Issues Found"
          value={metrics ? String(metrics.aiReviews ?? 0) : "—"}
          delta={statDeltas.issues.text}
          deltaVariant={statDeltas.issues.variant}
          accent={STAT_ACCENTS.issues}
        />
      </motion.div>

      {metrics && metrics.criticalIssues > 0 && (
        <motion.div
          variants={item}
          className="glass-card p-5 border-l-4"
          style={{ borderLeftColor: "var(--kd-critical)" }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-kd-critical" />
            <div>
              <p className="text-sm font-semibold text-kd-text">
                {metrics.criticalIssues} Critical Issue
                {metrics.criticalIssues !== 1 ? "s" : ""} Detected
              </p>
              <p className="text-xs text-kd-text-muted">
                Review your pull requests for security vulnerabilities and
                critical bugs.
              </p>
            </div>
            <Link href="/ai-reviews" className="ml-auto btn-ghost text-xs">
              View PRs
            </Link>
          </div>
        </motion.div>
      )}

      <motion.div variants={item} className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
          <h2 className="text-lg font-semibold text-kd-text">
            Connected GitHub Account
          </h2>
        </div>
        <div className="kd-github-account-row flex items-center gap-4 p-4 rounded-xl bg-kd-bg/50 border border-kd-border pl-4">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-8 h-8 text-kd-text-muted shrink-0"
            aria-hidden
          >
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-kd-text">
              @{profile?.username || user?.user_metadata?.user_name || "N/A"}
            </p>
            <p className="text-xs text-kd-text-muted truncate">
              {profile?.email || user?.email || "N/A"}
            </p>
          </div>
          <span className="kd-connected-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            Connected
          </span>
        </div>
      </motion.div>

      <motion.div
        variants={container}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <motion.div variants={item} className="overview-action-card">
          <div className="flex items-start gap-3">
            <div className="overview-action-icon overview-action-icon--purple">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-kd-text">Connect Repositories</h3>
              <p className="text-xs text-kd-text-muted mt-1">
                Select repos for AI code review
              </p>
            </div>
          </div>
          <div className="mt-auto pt-5">
            {installUrl ? (
              <a
                href={installUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-sm w-full sm:w-auto inline-flex justify-center"
              >
                Install GitHub App
              </a>
            ) : (
              <p className="text-xs text-kd-text-muted">
                Set NEXT_PUBLIC_GITHUB_APP_SLUG to enable installs.
              </p>
            )}
          </div>
        </motion.div>

        <motion.div variants={item} className="overview-action-card">
          <div className="flex items-start gap-3">
            <div className="overview-action-icon overview-action-icon--green">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-kd-text">Start AI Review</h3>
              <p className="text-xs text-kd-text-muted mt-1">
                Analyze your latest pull requests
              </p>
            </div>
          </div>
          <div className="mt-auto pt-5">
            <Link
              href="/pull-requests"
              className="btn-ghost text-sm w-full sm:w-auto inline-flex justify-center border border-kd-border"
            >
              View pull requests
            </Link>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        variants={container}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <motion.div variants={item} className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-kd-text">
                Live Activity Feed
              </h3>
              <p className="text-xs text-kd-text-muted">
                Recent GitHub events and review activity.
              </p>
            </div>
            <span className="text-xs text-kd-text-muted">
              {loadingData ? "Syncing…" : "Up to date"}
            </span>
          </div>
          <LiveActivityFeed
            items={activityItems}
            groupHeader={activityGroupHeader}
            loading={loadingActivity}
          />
        </motion.div>

        <motion.div variants={item} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-kd-text">
              Connected Repositories
            </h3>
            <Link href="/repositories" className="text-xs text-kd-accent">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {repositories.length === 0 ? (
              <p className="text-sm text-kd-text-muted">
                No repositories connected yet.
              </p>
            ) : (
              repositories.slice(0, 4).map((repo) => (
                <div
                  key={repo.id}
                  className="rounded-xl border border-kd-border bg-kd-bg/40 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-kd-text">
                    {repo.repo_name}
                  </p>
                  <p className="text-xs text-kd-text-muted">{repo.full_name}</p>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-kd-text-muted">
                    <span>{repo.private ? "Private" : "Public"}</span>
                    <span>{formatTimestamp(repo.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
