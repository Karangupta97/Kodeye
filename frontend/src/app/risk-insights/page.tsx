"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListItemSkeleton } from "@/components/ui/Skeleton";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { Shield, ArrowUpRight } from "lucide-react";

interface PullRequestRecord {
  id: string;
  pr_number: number;
  title: string;
  risk_score: number;
  issue_counts: { critical: number; total: number };
  repository: { repo_name: string } | null;
}

export default function RiskInsightsPage() {
  const [prs, setPrs] = useState<PullRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<PullRequestRecord[]>("/api/pull-requests")
      .then(setPrs)
      .catch(() => setError("Failed to load risk data."))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...prs].sort((a, b) => b.risk_score - a.risk_score);
  const avgRisk =
    prs.length > 0
      ? Math.round(prs.reduce((s, p) => s + p.risk_score, 0) / prs.length)
      : 0;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      <PageHeader
        title="Risk Insights"
        description="Aggregate risk scores and critical findings across pull requests."
      />

      <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs text-kd-text-muted">Average risk</p>
          <p className="text-3xl font-bold text-kd-glow mt-1">{avgRisk}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-kd-text-muted">High-risk PRs (≥50)</p>
          <p className="text-3xl font-bold text-kd-warning mt-1">
            {prs.filter((p) => p.risk_score >= 50).length}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-kd-text-muted">Critical findings</p>
          <p className="text-3xl font-bold text-kd-critical mt-1">
            {prs.reduce((s, p) => s + p.issue_counts.critical, 0)}
          </p>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp} className="glass-card p-6">
        {loading ? (
          <ListItemSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : sorted.length === 0 ? (
          <p className="text-sm text-kd-text-muted text-center py-8">
            No risk data yet. Run AI reviews on pull requests.
          </p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((pr) => (
              <li
                key={pr.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-kd-border bg-kd-bg/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Shield className="w-5 h-5 text-kd-critical shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-kd-text truncate">{pr.title}</p>
                    <p className="text-xs text-kd-text-muted">
                      {pr.repository?.repo_name} · #{pr.pr_number}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-lg font-bold text-kd-glow">{pr.risk_score}</span>
                  <Link
                    href={`/reviews/${pr.id}`}
                    className="text-xs text-kd-accent inline-flex items-center gap-1"
                  >
                    Review
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </motion.div>
  );
}
