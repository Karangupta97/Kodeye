"use client";

import type { ReviewBundle } from "@/lib/review-api";

interface ReviewDebugPanelProps {
  bundle: ReviewBundle;
}

export default function ReviewDebugPanel({ bundle }: ReviewDebugPanelProps) {
  if (!bundle.debug) return null;

  const rows: Array<{ label: string; value: string | number | boolean }> = [
    { label: "PR ID", value: bundle.debug.pr_id },
    { label: "Findings", value: bundle.debug.findings_count },
    { label: "Fixes", value: bundle.debug.fixes_count },
    { label: "Agents", value: bundle.debug.agents_count },
    { label: "Has risk score", value: bundle.debug.has_risk_score },
    { label: "Risk overall", value: bundle.debug.risk_overall },
    {
      label: "Review completed event",
      value: bundle.debug.review_completed_event,
    },
    { label: "Progress state", value: bundle.debug.progress_state },
  ];

  return (
    <details className="glass-card p-3 text-xs border border-dashed border-kd-warning/40">
      <summary className="cursor-pointer font-semibold text-kd-warning list-none flex items-center justify-between">
        Review debug
        <span className="text-[10px] font-normal text-kd-text-muted">
          ?debug=1
        </span>
      </summary>
      <dl className="mt-3 grid grid-cols-2 gap-2 font-mono">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-kd-text-muted">{row.label}</dt>
            <dd className="text-kd-text truncate">{String(row.value)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
