"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/lib/api";
import {
  GitBranch,
  Shield,
  Activity,
  Zap,
  Star,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Bug,
} from "lucide-react";
import RiskScoreRing from "@/components/review/RiskScoreRing";

/* ── Animation Variants ────────────────────────────────── */
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

interface RepositorySummary {
  id: string;
  repo_name: string;
  full_name: string;
  private: boolean;
  created_at?: string;
}

interface WebhookLogEntry {
  id: string;
  event_type: string;
  action: string | null;
  repository: string | null;
  created_at?: string;
}

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
};

/* ── Stat Card Component ───────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: string;
  color: string;
}) {
  return (
    <motion.div variants={item} className="stat-card group">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
        >
          <Icon
            className="w-5 h-5"
            style={{ color }}
          />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-xs font-semibold text-kd-success">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-kd-text tracking-tight">{value}</p>
      <p className="text-sm text-kd-text-muted mt-1">{label}</p>
    </motion.div>
  );
}

/* ── Dashboard Page ────────────────────────────────────── */
export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
  const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [metricsData, repoData, logData] = await Promise.all([
          fetchApi<Metrics>("/api/metrics"),
          fetchApi<RepositorySummary[]>("/api/repositories"),
          fetchApi<WebhookLogEntry[]>("/api/webhook-logs?limit=12"),
        ]);

        if (!active) {
          return;
        }

        setMetrics(metricsData);
        setRepositories(repoData);
        setLogs(logData);
      } catch {
        if (!active) {
          return;
        }
        setMetrics(null);
        setRepositories([]);
        setLogs([]);
      } finally {
        if (active) {
          setLoadingData(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-8"
    >
      {/* ── Welcome Header ───────────────────────────────── */}
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

      {/* ── Stats Grid ───────────────────────────────────── */}
      <motion.div
        variants={container}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={GitBranch}
          label="Repositories"
          value={metrics ? (metrics.repositories ?? 0).toString() : "—"}
          color="var(--kd-primary)"
        />
        <StatCard
          icon={Shield}
          label="Security Findings"
          value={metrics ? (metrics.securityFindings ?? 0).toString() : "—"}
          color="var(--kd-critical)"
        />
        <StatCard
          icon={Activity}
          label="PRs Reviewed"
          value={metrics ? (metrics.pullRequests ?? 0).toString() : "—"}
          color="var(--kd-success)"
        />
        <StatCard
          icon={Bug}
          label="Issues Found"
          value={metrics ? (metrics.aiReviews ?? 0).toString() : "—"}
          color="var(--kd-warning)"
        />
      </motion.div>

      {/* ── Critical Issues Overview ─────────────────────── */}
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
                {metrics.criticalIssues} Critical Issue{metrics.criticalIssues !== 1 ? "s" : ""} Detected
              </p>
              <p className="text-xs text-kd-text-muted">
                Review your pull requests for security vulnerabilities and critical bugs.
              </p>
            </div>
            <Link href="/pull-requests" className="ml-auto btn-ghost text-xs">
              View PRs
            </Link>
          </div>
        </motion.div>
      )}

      {/* ── Connected Account ────────────────────────────── */}
      <motion.div variants={item} className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-5 h-5 text-kd-success" />
          <h2 className="text-lg font-semibold text-kd-text">
            Connected GitHub Account
          </h2>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-kd-bg/50 border border-kd-border">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-8 h-8 text-kd-text-muted"
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
          <span className="flex items-center gap-1.5 text-xs font-semibold text-kd-success bg-kd-success/10 px-2.5 py-1 rounded-full border border-kd-success/20">
            <span className="w-1.5 h-1.5 rounded-full bg-kd-success animate-pulse" />
            Connected
          </span>
        </div>
      </motion.div>

      {/* ── Quick Actions ────────────────────────────────── */}
      <motion.div
        variants={container}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <motion.div variants={item} className="glass-card p-6 group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-kd-primary/15 flex items-center justify-center group-hover:bg-kd-primary/25 transition-colors">
              <GitBranch className="w-5 h-5 text-kd-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-kd-text">
                Connect Repositories
              </h3>
              <p className="text-xs text-kd-text-muted">
                Select repos for AI code review
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-kd-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {installUrl ? (
            <a
              href={installUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary text-sm"
            >
              Install GitHub App
            </a>
          ) : (
            <p className="text-xs text-kd-text-muted">
              Set NEXT_PUBLIC_GITHUB_APP_SLUG to enable installs.
            </p>
          )}
        </motion.div>

        <motion.div variants={item} className="glass-card p-6 group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-kd-glow/15 flex items-center justify-center group-hover:bg-kd-glow/25 transition-colors">
              <Zap className="w-5 h-5 text-kd-glow" />
            </div>
            <div>
              <h3 className="font-semibold text-kd-text">
                Start AI Review
              </h3>
              <p className="text-xs text-kd-text-muted">
                Analyze your latest pull requests
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-kd-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <Link href="/pull-requests" className="btn-ghost text-sm">
            View pull requests
          </Link>
        </motion.div>
      </motion.div>

      {/* ── Activity & Repositories ───────────────────── */}
      <motion.div
        variants={container}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <motion.div
          variants={item}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-kd-text">
                Live Activity Feed
              </h3>
              <p className="text-xs text-kd-text-muted">
                Recent webhook events and AI review activity.
              </p>
            </div>
            <span className="text-xs text-kd-text-muted">
              {loadingData ? "Syncing..." : "Up to date"}
            </span>
          </div>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-kd-text-muted">
                No webhook events yet. Open a pull request to see activity.
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-xl border border-kd-border bg-kd-bg/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      log.event_type === "comment_posted"
                        ? "bg-kd-success"
                        : log.event_type === "pull_request"
                          ? "bg-kd-primary"
                          : "bg-kd-text-muted"
                    }`} />
                    <div>
                      <p className="text-sm font-semibold text-kd-text">
                        {log.event_type}
                        {log.action ? ` - ${log.action}` : ""}
                      </p>
                      <p className="text-xs text-kd-text-muted">
                        {log.repository || "Repository sync"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-kd-text-muted">
                    {formatTimestamp(log.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
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
                  <p className="text-xs text-kd-text-muted">
                    {repo.full_name}
                  </p>
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
