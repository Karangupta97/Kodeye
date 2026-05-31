"use client";

import { motion } from "framer-motion";
import type { ReviewBundle } from "@/lib/review-api";
import {
  severityAnalytics,
  type SeverityKey,
} from "@/lib/review-bundle-utils";
import { SEV_COLORS, severityGradient } from "@/lib/severity-colors";

interface Props {
  bundle: ReviewBundle;
  activeSeverity?: string | null;
  onSeverityFilter?: (severity: string | null) => void;
  loading?: boolean;
}

const SEGMENT_GAP = 4;

function SeverityDonut({
  rows,
  total,
  activeSeverity,
  onSegmentClick,
}: {
  rows: ReturnType<typeof severityAnalytics>["rows"];
  total: number;
  activeSeverity?: string | null;
  onSegmentClick?: (key: SeverityKey) => void;
}) {
  const size = 168;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const activeRows = rows.filter((r) => r.count > 0);

  let offset = 0;

  return (
    <div className="severity-donut-wrap flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <defs>
            {(Object.keys(SEV_COLORS) as SeverityKey[]).map((key) => (
              <linearGradient
                key={key}
                id={`sev-donut-${key}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={SEV_COLORS[key].base} />
                <stop offset="100%" stopColor={SEV_COLORS[key].light} />
              </linearGradient>
            ))}
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="severity-donut-track"
            strokeWidth={strokeWidth}
          />
          {activeRows.map((row) => {
            const pct = row.count / total;
            const segmentLength = Math.max(
              pct * circumference - SEGMENT_GAP,
              0
            );
            const dashOffset = -offset;
            offset += pct * circumference;

            const glow = SEV_COLORS[row.key].glow;

            return (
              <motion.circle
                key={row.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={`url(#sev-donut-${row.key})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="severity-donut-segment cursor-pointer outline-none"
                data-severity={row.key}
                style={{
                  filter:
                    activeSeverity === row.key
                      ? `drop-shadow(0 0 10px ${glow})`
                      : undefined,
                  opacity:
                    activeSeverity && activeSeverity !== row.key ? 0.45 : 1,
                }}
                initial={{ opacity: 0 }}
                animate={{
                  opacity:
                    activeSeverity && activeSeverity !== row.key ? 0.45 : 1,
                }}
                transition={{ duration: 0.5 }}
                onClick={() => onSegmentClick?.(row.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSegmentClick?.(row.key);
                  }
                }}
                aria-label={`${row.label}: ${row.count} issues`}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span
            className="analytics-metric"
            key={total}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {total}
          </motion.span>
          <span className="analytics-label mt-1">Total</span>
        </div>
      </div>
      {activeRows.length > 0 && (
        <p className="severity-donut-hint">Tap segments to filter</p>
      )}
    </div>
  );
}

function SeveritySkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <div className="analytics-skeleton-ring" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="analytics-skeleton-tile h-[4.25rem]" />
        <div className="analytics-skeleton-tile h-[4.25rem]" />
      </div>
      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="severity-row-skeleton">
            <div className="flex justify-between mb-2">
              <div className="analytics-skeleton-pill w-16 h-3" />
              <div className="analytics-skeleton-pill w-10 h-3" />
            </div>
            <div className="severity-pill-track">
              <div
                className="analytics-skeleton-pill h-full rounded-full"
                style={{ width: `${70 - i * 12}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SeverityAnalytics({
  bundle,
  activeSeverity,
  onSeverityFilter,
  loading,
}: Props) {
  const { rows, total, dominant, topCategory } = severityAnalytics(bundle);

  const toggleSeverity = (key: SeverityKey) => {
    onSeverityFilter?.(activeSeverity === key ? null : key);
  };

  if (loading) return <SeveritySkeleton />;

  return (
    <div className="severity-analytics space-y-5">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="analytics-stat-tile">
          <p className="analytics-label">Total findings</p>
          <motion.p
            className="analytics-metric mt-1"
            key={total}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {total}
          </motion.p>
        </div>
        <div className="analytics-stat-tile">
          <p className="analytics-label">Highest severity</p>
          <p
            className={`text-xl font-bold mt-1 leading-tight ${
              total > 0 ? "" : "text-kd-text-muted"
            }`}
            style={
              total > 0
                ? { color: SEV_COLORS[dominant.key].base }
                : undefined
            }
          >
            {total > 0 ? dominant.label : "—"}
          </p>
        </div>
      </div>

      <SeverityDonut
        rows={rows}
        total={total}
        activeSeverity={activeSeverity}
        onSegmentClick={toggleSeverity}
      />

      <div className="space-y-2">
        {rows.map((row) => {
          const colors = SEV_COLORS[row.key];
          const isActive = activeSeverity === row.key;

          return (
            <button
              key={row.key}
              type="button"
              onClick={() => toggleSeverity(row.key)}
              className={`severity-row w-full text-left ${isActive ? "severity-row-active" : ""}`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-medium text-kd-text flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: colors.base,
                      boxShadow: isActive ? `0 0 8px ${colors.glow}` : undefined,
                    }}
                  />
                  {row.label}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="severity-count-badge">{row.count}</span>
                  <span className="severity-pct font-mono text-[11px] tabular-nums">
                    {row.percent}%
                  </span>
                </div>
              </div>
              <div className="severity-pill-track">
                <motion.div
                  className="severity-pill-fill"
                  style={{ background: severityGradient(row.key) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${row.percent}%` }}
                  transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {topCategory && topCategory.count > 0 && (
        <p className="severity-footnote">
          Highest risk area:{" "}
          <span className="text-kd-text font-medium">{topCategory.label}</span>{" "}
          <span className="severity-count-badge inline-flex ml-1 align-middle">
            {topCategory.count}
          </span>
        </p>
      )}
    </div>
  );
}
