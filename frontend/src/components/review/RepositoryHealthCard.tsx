"use client";

import { motion } from "framer-motion";
import type { ReviewBundle } from "@/lib/review-api";

interface Props {
  riskScore: ReviewBundle["risk_score"];
  loading?: boolean;
}

const metrics = (risk: ReviewBundle["risk_score"]) => [
  { label: "Security", score: risk.security_score, color: "var(--kd-critical)" },
  {
    label: "Performance",
    score: risk.performance_score,
    color: "var(--kd-warning)",
  },
  {
    label: "Maintainability",
    score: risk.maintainability_score,
    color: "var(--kd-primary)",
  },
  {
    label: "Architecture",
    score: risk.architecture_score,
    color: "var(--kd-glow)",
  },
];

export default function RepositoryHealthCard({ riskScore, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="shimmer h-10 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {metrics(riskScore).map((m, i) => (
        <div key={m.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-kd-text-muted">{m.label}</span>
            <motion.span
              className="font-bold text-kd-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.08 }}
            >
              {m.score}
            </motion.span>
          </div>
          <div className="risk-bar h-2">
            <motion.div
              className="risk-bar-fill h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${m.color}, var(--kd-glow))`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, m.score)}%` }}
              transition={{ duration: 0.8, delay: i * 0.06 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
