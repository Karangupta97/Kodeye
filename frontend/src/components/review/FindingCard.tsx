"use client";

import { motion } from "framer-motion";
import SeverityBadge from "./SeverityBadge";
import { Shield, Bug, Zap, Palette } from "lucide-react";

interface FindingCardProps {
  severity: string;
  category: string;
  file: string;
  line: number;
  issue: string;
  why: string;
  fix: string;
  confidence: number;
  index?: number;
}

const categoryConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  security: { icon: Shield, label: "Security", color: "var(--kd-critical)" },
  bug: { icon: Bug, label: "Bug", color: "var(--kd-warning)" },
  performance: { icon: Zap, label: "Performance", color: "#F97316" },
  style: { icon: Palette, label: "Code Quality", color: "var(--kd-accent)" },
};

export default function FindingCard({
  severity,
  category,
  file,
  line,
  issue,
  why,
  fix,
  confidence,
  index = 0,
}: FindingCardProps) {
  const cat = categoryConfig[category] || categoryConfig.style;
  const Icon = cat.icon;
  const confidencePercent = Math.round(confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="finding-card group"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `color-mix(in srgb, ${cat.color} 15%, transparent)` }}
          >
            <Icon className="w-4 h-4" style={{ color: cat.color }} />
          </div>
          <div>
            <SeverityBadge severity={severity} size="md" />
            <span className="text-xs text-kd-text-muted ml-2">{cat.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: cat.color }}
          />
          <span className="text-xs font-medium text-kd-text-muted">
            {confidencePercent}%
          </span>
        </div>
      </div>

      {/* File location */}
      <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-kd-bg/60 border border-kd-border/50">
        <code className="text-xs text-kd-accent font-mono truncate">{file}</code>
        <span className="text-xs text-kd-text-muted">:</span>
        <code className="text-xs text-kd-warning font-mono">L{line}</code>
      </div>

      {/* Issue */}
      <h4 className="text-sm font-semibold text-kd-text mb-2">{issue}</h4>

      {/* Why */}
      <div className="mb-3">
        <p className="text-[11px] font-semibold text-kd-text-muted uppercase tracking-wider mb-1">
          Why this matters
        </p>
        <p className="text-xs text-kd-text-muted leading-relaxed">{why}</p>
      </div>

      {/* Fix */}
      <div>
        <p className="text-[11px] font-semibold text-kd-text-muted uppercase tracking-wider mb-1">
          Recommended fix
        </p>
        <div className="text-xs text-kd-text leading-relaxed bg-kd-bg/40 border border-kd-border/50 rounded-lg px-3 py-2 font-mono">
          {fix}
        </div>
      </div>
    </motion.div>
  );
}
