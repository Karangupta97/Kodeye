"use client";

interface SeverityBadgeProps {
  severity: string;
  size?: "sm" | "md";
}

const config: Record<string, { emoji: string; label: string; className: string }> = {
  critical: {
    emoji: "🔴",
    label: "Critical",
    className: "severity-badge-critical",
  },
  high: {
    emoji: "🟠",
    label: "High",
    className: "severity-badge-warning",
  },
  warning: {
    emoji: "🟠",
    label: "High",
    className: "severity-badge-warning",
  },
  medium: {
    emoji: "🟡",
    label: "Medium",
    className: "severity-badge-suggestion",
  },
  suggestion: {
    emoji: "🟡",
    label: "Medium",
    className: "severity-badge-suggestion",
  },
  low: {
    emoji: "🟢",
    label: "Low",
    className: "severity-badge-info",
  },
  info: {
    emoji: "🔵",
    label: "Low",
    className: "severity-badge-info",
  },
};

export default function SeverityBadge({ severity, size = "sm" }: SeverityBadgeProps) {
  const c = config[severity] || config.info;
  const sizeClass = size === "md" ? "text-xs px-2.5 py-1" : "text-[11px] px-2 py-0.5";

  return (
    <span className={`${c.className} ${sizeClass} inline-flex items-center gap-1 font-semibold rounded-full`}>
      <span>{c.emoji}</span>
      {c.label}
    </span>
  );
}
