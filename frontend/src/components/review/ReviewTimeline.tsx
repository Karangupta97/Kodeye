"use client";

import { motion } from "framer-motion";
import { Check, Loader2, Circle } from "lucide-react";
import { formatDurationMs } from "@/lib/review-bundle-utils";

export interface TimelineEventItem {
  id: string;
  label: string;
  detail?: string | null;
  timestamp?: string;
  status: string;
  event_type?: string;
  duration_ms?: number;
  icon?: string;
}

interface ReviewTimelineProps {
  events: TimelineEventItem[];
  loading?: boolean;
}

const statusVisual = (status: string) => {
  if (status === "active" || status === "running") {
    return {
      ring: "border-kd-glow bg-kd-glow/10",
      icon: <Loader2 className="w-3 h-3 text-kd-glow animate-spin" />,
    };
  }
  if (status === "done" || status === "completed") {
    return {
      ring: "border-kd-success/50 bg-kd-success/15",
      icon: <Check className="w-3 h-3 text-kd-success" />,
    };
  }
  return {
    ring: "border-kd-border bg-kd-bg/60",
    icon: <Circle className="w-2.5 h-2.5 text-kd-text-muted" />,
  };
};

export default function ReviewTimeline({ events, loading }: ReviewTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-4 py-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="shimmer w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="shimmer h-3 w-3/4 rounded" />
              <div className="shimmer h-2 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events.length) {
    return (
      <p className="text-xs text-kd-text-muted text-center py-6">
        No timeline events yet. Run a review to see activity.
      </p>
    );
  }

  return (
    <ol className="review-timeline relative pl-1">
      <div
        className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-kd-primary/40 via-kd-border to-transparent"
        aria-hidden
      />
      {events.map((event, idx) => {
        const visual = statusVisual(event.status);
        const duration = formatDurationMs(event.duration_ms);
        const timeLabel = event.timestamp
          ? new Date(event.timestamp).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })
          : null;

        return (
          <motion.li
            key={event.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.05 }}
            className="relative flex gap-3 pb-5 last:pb-0"
          >
            <div
              className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border shrink-0 ${visual.ring}`}
            >
              {event.icon ? (
                <span className="text-sm leading-none" aria-hidden>
                  {event.icon}
                </span>
              ) : (
                visual.icon
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-xs font-semibold text-kd-text leading-snug">
                {event.label}
              </p>
              {event.detail && (
                <p className="text-[10px] text-kd-text-muted mt-0.5 line-clamp-2">
                  {event.detail}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-kd-text-muted">
                {timeLabel && <span>{timeLabel}</span>}
                {duration && (
                  <span className="font-mono text-kd-glow">{duration}</span>
                )}
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
