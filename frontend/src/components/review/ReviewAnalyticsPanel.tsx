"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import AIReviewSummary from "./AIReviewSummary";
import SeverityAnalytics from "./SeverityAnalytics";
import RepositoryHealthCard from "./RepositoryHealthCard";
import ReviewMetadataCard from "./ReviewMetadataCard";
import ReviewTimeline from "./ReviewTimeline";
import type { ReviewBundle } from "@/lib/review-api";

interface Props {
  bundle: ReviewBundle;
  loading?: boolean;
  onSeverityFilter?: (severity: string | null) => void;
  onCategoryFilter?: (category: string | null) => void;
  onAgentFilter?: (agentId: string | null) => void;
  activeSeverity?: string | null;
  activeCategory?: string | null;
  activeAgent?: string | null;
}

function Section({
  title,
  children,
  className = "",
  variant = "default",
}: {
  title: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "analytics";
}) {
  const cardClass =
    variant === "analytics" ? "analytics-card" : "glass-card";
  const titleClass =
    variant === "analytics"
      ? "analytics-card-title"
      : "text-xs font-semibold uppercase tracking-wider text-kd-text-muted mb-3";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`${cardClass} p-4 ${className}`}
    >
      <h3 className={titleClass}>{title}</h3>
      {children}
    </motion.section>
  );
}

export default function ReviewAnalyticsPanel({
  bundle,
  loading,
  onSeverityFilter,
  onCategoryFilter,
  onAgentFilter,
  activeSeverity,
  activeCategory,
  activeAgent,
}: Props) {
  const {
    risk_score,
    breakdown,
    category_counts,
    agents,
    timeline,
    fix_suggestions: fixStats,
    findings,
    review_metadata,
  } = bundle;

  return (
    <aside className="review-analytics-panel flex flex-col gap-4 pb-8">
      <Section title="AI Review Summary" variant="analytics">
        <AIReviewSummary
          score={risk_score.overall_score}
          riskLevel={risk_score.risk_level}
          issueCount={findings.length}
          fixCount={fixStats?.fixes_generated ?? 0}
          loading={loading}
        />
      </Section>

      <Section title="Risk score analytics" variant="analytics">
        {loading ? (
          <div className="shimmer h-24 rounded-lg" />
        ) : (
          <div className="grid grid-cols-2 gap-2 text-center">
            {[
              { label: "Overall", value: risk_score.overall_score },
              { label: "Security", value: risk_score.security_score },
              { label: "Performance", value: risk_score.performance_score },
              {
                label: "Maintainability",
                value: risk_score.maintainability_score,
              },
            ].map((item) => (
              <div key={item.label} className="analytics-stat-tile">
                <p className="analytics-label">{item.label}</p>
                <p className="text-lg font-bold text-kd-text mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Review breakdown">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-8 rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {breakdown.map((item) => (
              <div key={item.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-kd-text">{item.category}</span>
                  <span className="text-kd-text-muted">
                    {item.issueCount} · {item.percentage}%
                  </span>
                </div>
                <div className="risk-bar">
                  <motion.div
                    className="risk-bar-fill"
                    style={{
                      background:
                        item.severity === "critical"
                          ? "var(--kd-critical)"
                          : "var(--kd-primary)",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Issues by severity" variant="analytics">
        <SeverityAnalytics
          bundle={bundle}
          activeSeverity={activeSeverity}
          onSeverityFilter={onSeverityFilter}
          loading={loading}
        />
      </Section>

      <Section title="Top categories">
        {loading ? (
          <div className="shimmer h-12 rounded" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {category_counts.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() =>
                  onCategoryFilter?.(
                    activeCategory === cat.key ? null : cat.key
                  )
                }
                className={`filter-btn text-xs ${
                  activeCategory === cat.key ? "filter-btn-active" : ""
                }`}
              >
                {cat.label}
                <span className="opacity-60">({cat.count})</span>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="AI agents">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="shimmer h-12 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() =>
                  onAgentFilter?.(activeAgent === agent.id ? null : agent.id)
                }
                className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-lg bg-kd-bg/40 border text-left transition-colors ${
                  activeAgent === agent.id
                    ? "border-kd-glow bg-kd-glow/10"
                    : "border-kd-border/50 hover:border-kd-primary/40"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-kd-text truncate">
                    {agent.name}
                  </p>
                  <p className="text-[10px] text-kd-success capitalize">
                    {agent.status}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-kd-glow">
                    {agent.findingsCount}
                  </p>
                  <p className="text-[10px] text-kd-text-muted">
                    {(agent.executionTimeMs / 1000).toFixed(1)}s
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Timeline" className="review-timeline-section">
        <ReviewTimeline events={timeline} loading={loading} />
      </Section>

      <Section title="Repository health">
        <RepositoryHealthCard riskScore={risk_score} loading={loading} />
      </Section>

      {review_metadata && (
        <Section title="Review metadata">
          <ReviewMetadataCard metadata={review_metadata} loading={loading} />
        </Section>
      )}
    </aside>
  );
}
