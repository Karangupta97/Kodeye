"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, Shield, Filter } from "lucide-react";
import type { ReviewBundle, ReviewFinding, ReviewAiFix } from "@/lib/review-api";
import FixSuggestionPanel from "./FixSuggestionPanel";
import SeverityBadge from "./SeverityBadge";

interface FixSuggestionsTabProps {
  bundle: ReviewBundle;
  findings: ReviewFinding[];
  onReload: () => void;
}

type FixFilter = "all" | "with-fix" | "without-fix";

export default function FixSuggestionsTab({
  bundle,
  findings,
  onReload,
}: FixSuggestionsTabProps) {
  const [fixFilter, setFixFilter] = useState<FixFilter>("all");
  const stats = bundle.fix_suggestions;

  const items = useMemo(() => {
    const byFinding = new Map(
      (bundle.fix_records ?? []).map((r) => [r.finding_id, r])
    );
    return findings.map((finding) => {
      const record = byFinding.get(finding.id);
      const aiFix: ReviewAiFix | null = finding.ai_fix
        ? finding.ai_fix
        : record
          ? {
              id: record.id,
              original_code: record.original_code,
              suggested_code: record.suggested_code,
              explanation: record.explanation,
              why_fix_works: record.why_fix_works,
              confidence: record.confidence,
              confidence_percent: record.confidence_percent,
              confidence_label: record.confidence_label,
              start_line: record.start_line,
              end_line: record.end_line,
              status: record.status,
            }
          : null;
      return { finding, aiFix };
    });
  }, [findings, bundle.fix_records]);

  const filtered = useMemo(() => {
    if (fixFilter === "with-fix") {
      return items.filter((i) => i.aiFix != null);
    }
    if (fixFilter === "without-fix") {
      return items.filter((i) => i.aiFix == null);
    }
    return items;
  }, [items, fixFilter]);

  if (bundle.ai_review_status === "pending") {
    return (
      <div className="glass-card p-10 text-center">
        <Zap className="w-10 h-10 text-kd-primary mx-auto mb-3" />
        <p className="text-sm font-medium text-kd-text">No AI review yet</p>
        <p className="text-xs text-kd-text-muted mt-1">
          Run analysis first to generate fix suggestions.
        </p>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <Shield className="w-10 h-10 text-kd-success mx-auto mb-3" />
        <p className="text-sm font-medium text-kd-text">No findings</p>
        <p className="text-xs text-kd-text-muted mt-1">
          Nothing to fix — this review is clean.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Findings", value: stats.total_findings },
            { label: "Fixes generated", value: stats.fixes_generated },
            { label: "High confidence", value: stats.high_confidence },
            {
              label: "Avg confidence",
              value:
                stats.average_confidence > 0
                  ? `${stats.average_confidence}%`
                  : "—",
            },
          ].map((card) => (
            <div key={card.label} className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-kd-glow">{card.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-kd-text-muted mt-1">
                {card.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "all" as const, label: "All" },
            { key: "with-fix" as const, label: "With fix" },
            { key: "without-fix" as const, label: "Needs fix" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFixFilter(key)}
            className={`filter-btn ${fixFilter === key ? "filter-btn-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Filter className="w-10 h-10 text-kd-text-muted mx-auto mb-3" />
          <p className="text-sm font-medium text-kd-text">No matching fixes</p>
          <p className="text-xs text-kd-text-muted mt-1">
            Try another filter or generate fixes for findings below.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ finding, aiFix }, i) => (
            <motion.article
              key={finding.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <SeverityBadge severity={finding.severity} />
                    <span className="text-[10px] uppercase tracking-wider text-kd-text-muted">
                      {finding.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-kd-text">
                    {finding.issue}
                  </h3>
                  <p className="text-xs font-mono text-kd-accent mt-1 truncate">
                    {finding.file}:{finding.line}
                  </p>
                </div>
                {aiFix && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-kd-glow px-2 py-0.5 rounded-full border border-kd-glow/30 bg-kd-glow/10">
                    <Sparkles className="w-3 h-3" />
                    {aiFix.confidence_percent}% · {aiFix.confidence_label}
                  </span>
                )}
              </div>

              <FixSuggestionPanel
                findingId={finding.id}
                issue={finding.issue}
                severity={finding.severity}
                filePath={finding.file}
                aiFix={aiFix}
                onFixUpdated={() => onReload()}
              />
            </motion.article>
          ))}
        </div>
      )}

      <p className="text-[10px] text-center text-kd-text-muted/80 italic">
        AI-generated patches are suggestions only — review before applying.
      </p>
    </div>
  );
}
