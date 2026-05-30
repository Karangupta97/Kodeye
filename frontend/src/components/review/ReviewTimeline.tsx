"use client";

import { motion } from "framer-motion";

interface TimelineEvent {
  id: string;
  label: string;
  detail?: string;
  timestamp?: string;
  status: "done" | "active" | "pending";
  icon?: string;
}

interface ReviewTimelineProps {
  events: TimelineEvent[];
}

const statusConfig: Record<string, { dot: string; pulse: boolean; textColor: string }> = {
  done: { dot: "bg-kd-success", pulse: false, textColor: "text-kd-text" },
  active: { dot: "bg-kd-glow", pulse: true, textColor: "text-kd-glow" },
  pending: { dot: "bg-kd-border", pulse: false, textColor: "text-kd-text-muted" },
};

export default function ReviewTimeline({ events }: ReviewTimelineProps) {
  return (
    <div className="review-timeline space-y-1">
      {events.map((event, idx) => {
        const cfg = statusConfig[event.status] || statusConfig.pending;

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.08 }}
            className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-kd-card/30 transition-colors"
          >
            {/* Dot */}
            <div className="relative mt-1.5 shrink-0">
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              {cfg.pulse && (
                <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${cfg.dot} animate-ping opacity-50`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {event.icon && <span className="text-sm">{event.icon}</span>}
                <p className={`text-sm font-medium ${cfg.textColor}`}>
                  {event.label}
                </p>
              </div>
              {event.detail && (
                <p className="text-xs text-kd-text-muted mt-0.5">{event.detail}</p>
              )}
            </div>

            {/* Timestamp */}
            {event.timestamp && (
              <span className="text-[10px] text-kd-text-muted whitespace-nowrap shrink-0">
                {event.timestamp}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
