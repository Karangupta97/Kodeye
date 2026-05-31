"use client";

import type { ReviewBundle } from "@/lib/review-api";
import { formatReviewDuration } from "@/lib/review-bundle-utils";

interface Props {
  metadata: NonNullable<ReviewBundle["review_metadata"]>;
  loading?: boolean;
}

const rows = (meta: NonNullable<ReviewBundle["review_metadata"]>) => [
  { label: "Repository", value: meta.repository },
  { label: "Branch", value: meta.branch },
  { label: "Base branch", value: meta.base_branch },
  { label: "Commits", value: String(meta.commit_count) },
  { label: "Files changed", value: String(meta.files_changed) },
  { label: "Lines added", value: `+${meta.lines_added}` },
  { label: "Lines removed", value: `-${meta.lines_removed}` },
  {
    label: "Review duration",
    value: formatReviewDuration(meta.review_duration_ms),
  },
  { label: "AI model", value: meta.ai_model },
  {
    label: "Review date",
    value: new Date(meta.reviewed_at).toLocaleString(),
  },
];

export default function ReviewMetadataCard({ metadata, loading }: Props) {
  if (loading) {
    return (
      <dl className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="shimmer h-8 rounded" />
        ))}
      </dl>
    );
  }

  return (
    <dl className="space-y-2">
      {rows(metadata).map((row) => (
        <div
          key={row.label}
          className="flex justify-between gap-3 text-xs border-b border-kd-border/30 pb-2 last:border-0 last:pb-0"
        >
          <dt className="text-kd-text-muted shrink-0">{row.label}</dt>
          <dd className="text-kd-text font-medium text-right truncate font-mono text-[11px]">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
