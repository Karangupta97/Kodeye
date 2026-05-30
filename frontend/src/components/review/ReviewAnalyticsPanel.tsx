"use client";

import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import RiskScoreRing from "./RiskScoreRing";
import type { ReviewBundle } from "@/lib/review-api";

const SEV_COLORS = {
  critical: "var(--kd-critical)",
  high: "#F97316",
  medium: "var(--kd-warning)",
  low: "var(--kd-success)",
};

interface Props {
  bundle: ReviewBundle;
  onSeverityFilter?: (severity: string | null) => void;
  onCategoryFilter?: (category: string | null) => void;
  onAgentFilter?: (agentId: string | null) => void;
  activeSeverity?: string | null;
  activeCategory?: string | null;
  activeAgent?: string | null;
}

export default function ReviewAnalyticsPanel({
  bundle,
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
    severity_counts,
    category_counts,
    agents,
    timeline,
    fix_suggestions: fixStats,
    findings,
  } = bundle;

  const pieData = [
    { name: "Critical", value: severity_counts.critical, key: "critical" },
    { name: "High", value: severity_counts.high, key: "high" },
    { name: "Medium", value: severity_counts.medium, key: "medium" },
    { name: "Low", value: severity_counts.low, key: "low" },
  ].filter((d) => d.value > 0);

  const riskInsights = [
    { label: "Security Risk", score: risk_score.security_score },
    { label: "Performance Risk", score: risk_score.performance_score },
    { label: "Maintainability", score: risk_score.maintainability_score },
    { label: "Architecture", score: risk_score.architecture_score },
  ];

  return (
    <aside className="review-analytics-panel space-y-4">
      <div className="glass-card p-5 text-center">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-kd-text-muted mb-4">
          AI Review Summary
        </h3>
        <RiskScoreRing score={risk_score.overall_score} size={140} />
        <p className="mt-3 text-sm font-semibold text-kd-text">
          Risk Level:{" "}
          <span className="text-kd-glow">{risk_score.risk_level}</span>
        </p>
        {fixStats && (
          <div className="mt-4 pt-4 border-t border-kd-border/50 text-left space-y-2">
            <p className="text-xs text-kd-text-muted">
              <span className="font-semibold text-kd-text">{findings.length}</span>{" "}
              issues found
            </p>
            <p className="text-xs text-kd-text-muted">
              <span className="font-semibold text-kd-glow">
                {fixStats.fixes_generated}
              </span>{" "}
              fixes generated
            </p>
            <p className="text-xs text-kd-text-muted">
              <span className="font-semibold text-kd-success">
                {fixStats.high_confidence}
              </span>{" "}
              high-confidence fixes
            </p>
            {fixStats.average_confidence > 0 && (
              <p className="text-[11px] text-kd-text-muted">
                Avg confidence: {fixStats.average_confidence}%
              </p>
            )}
          </div>
        )}
      </div>

      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-kd-text-muted mb-3">
          Review Breakdown
        </h3>
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
      </div>

      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-kd-text-muted mb-3">
          Issues by Severity
        </h3>
        {pieData.length > 0 ? (
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={40}
                  outerRadius={58}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={SEV_COLORS[entry.key as keyof typeof SEV_COLORS]}
                      className="cursor-pointer"
                      onClick={() =>
                        onSeverityFilter?.(
                          activeSeverity === entry.key ? null : entry.key
                        )
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--kd-card)",
                    border: "1px solid var(--kd-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-kd-text-muted text-center py-6">No issues</p>
        )}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {pieData.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() =>
                onSeverityFilter?.(activeSeverity === d.key ? null : d.key)
              }
              className={`text-left text-xs px-2 py-1 rounded-lg border transition-colors ${
                activeSeverity === d.key
                  ? "border-kd-primary/50 bg-kd-primary/10"
                  : "border-transparent"
              }`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5"
                style={{
                  background: SEV_COLORS[d.key as keyof typeof SEV_COLORS],
                }}
              />
              {d.name}: {d.value}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-kd-text-muted mb-3">
          Top Categories
        </h3>
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
      </div>

      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-kd-text-muted mb-3">
          AI Agents
        </h3>
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
      </div>

      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-kd-text-muted mb-3">
          Risk Insights
        </h3>
        <div className="space-y-2">
          {riskInsights.map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-kd-text-muted">{r.label}</span>
                <span className="font-semibold text-kd-text">{r.score}</span>
              </div>
              <div className="risk-bar">
                <motion.div
                  className="risk-bar-fill bg-gradient-to-r from-kd-primary to-kd-glow"
                  initial={{ width: 0 }}
                  animate={{ width: `${r.score}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-4 max-h-64 overflow-y-auto">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-kd-text-muted mb-3 sticky top-0 bg-kd-card/90 py-1">
          Timeline
        </h3>
        <ol className="space-y-3">
          {timeline.map((event) => (
            <li key={event.id} className="flex gap-2">
              <span
                className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                  event.status === "done"
                    ? "bg-kd-success"
                    : event.status === "running"
                      ? "bg-kd-warning animate-pulse"
                      : "bg-kd-border"
                }`}
              />
              <div>
                <p className="text-xs font-medium text-kd-text">{event.label}</p>
                {event.detail && (
                  <p className="text-[10px] text-kd-text-muted">{event.detail}</p>
                )}
                {event.timestamp && (
                  <p className="text-[10px] text-kd-text-muted/70 mt-0.5">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
