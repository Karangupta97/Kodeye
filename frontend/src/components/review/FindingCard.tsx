"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import SeverityBadge from "./SeverityBadge";
import {
  Shield,
  Bug,
  Zap,
  Palette,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { updateFindingInteraction, type ReviewAiFix } from "@/lib/review-api";
import FixSuggestionPanel from "./FixSuggestionPanel";

interface FindingCardProps {
  id: string;
  severity: string;
  category: string;
  file: string;
  line: number;
  issue: string;
  why: string;
  fix: string;
  confidence: number;
  impact?: string;
  reference?: string;
  interactions?: string[];
  ai_fix?: ReviewAiFix | null;
  index?: number;
  githubUrl?: string;
  onInteraction?: () => void;
}

const categoryConfig: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  security: { icon: Shield, label: "Security", color: "var(--kd-critical)" },
  bug: { icon: Bug, label: "Bug", color: "var(--kd-warning)" },
  performance: { icon: Zap, label: "Performance", color: "#F97316" },
  style: { icon: Palette, label: "Code Quality", color: "var(--kd-accent)" },
  architecture: {
    icon: Shield,
    label: "Architecture",
    color: "var(--kd-info)",
  },
};

export default function FindingCard({
  id,
  severity,
  category,
  file,
  line,
  issue,
  why,
  fix,
  confidence,
  impact,
  reference,
  interactions = [],
  ai_fix,
  index = 0,
  githubUrl,
  onInteraction,
}: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [localInteractions, setLocalInteractions] = useState(interactions);
  const cat = categoryConfig[category] || categoryConfig.style;
  const Icon = cat.icon;
  const confidencePercent = Math.round(confidence * 100);

  const act = async (action: string) => {
    try {
      await updateFindingInteraction(id, action);
      setLocalInteractions((prev) =>
        prev.includes(action) ? prev : [...prev, action]
      );
      onInteraction?.();
      toast.success("Saved");
    } catch {
      setLocalInteractions((prev) =>
        prev.includes(action) ? prev : [...prev, action]
      );
      toast.success("Noted");
    }
  };

  const copyFix = () => {
    navigator.clipboard.writeText(fix);
    toast.success("Copied recommendation");
  };

  const createGitHubIssue = () => {
    if (!githubUrl) {
      toast.error("GitHub URL unavailable");
      return;
    }
    const repoBase = githubUrl.replace(/\/pull\/\d+$/, "");
    const title = encodeURIComponent(`[Kodeye] ${issue}`);
    const body = encodeURIComponent(
      `**File:** \`${file}:${line}\`\n\n**Issue:** ${issue}\n\n**Why:** ${why}\n\n**Fix:**\n\`\`\`\n${fix}\n\`\`\``
    );
    window.open(`${repoBase}/issues/new?title=${title}&body=${body}`, "_blank");
  };

  const dismissed = localInteractions.includes("dismiss");
  const fixed = localInteractions.includes("mark_fixed");

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={`finding-card group ${fixed ? "opacity-60" : ""}`}
      id={`finding-${id}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${cat.color} 15%, transparent)`,
            }}
          >
            <Icon className="w-4 h-4" style={{ color: cat.color }} />
          </div>
          <div>
            <SeverityBadge severity={severity} size="md" />
            <span className="text-xs text-kd-text-muted ml-2">{cat.label}</span>
          </div>
        </div>
        <span className="text-xs font-medium text-kd-text-muted">
          {confidencePercent}% confidence
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-kd-bg/60 border border-kd-border/50">
        <code className="text-xs text-kd-accent font-mono truncate">{file}</code>
        <span className="text-xs text-kd-text-muted">:</span>
        <code className="text-xs text-kd-warning font-mono">L{line}</code>
      </div>

      <h4 className="text-sm font-semibold text-kd-text mb-2">{issue}</h4>

      <p className="text-xs text-kd-text-muted leading-relaxed mb-3">{why}</p>

      {impact && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-kd-text-muted uppercase tracking-wider mb-1">
            Impact
          </p>
          <p className="text-xs text-kd-text-muted">{impact}</p>
        </div>
      )}

      <div className="mb-3">
        <p className="text-[11px] font-semibold text-kd-text-muted uppercase tracking-wider mb-1">
          Recommended fix
        </p>
        <div className="text-xs text-kd-text leading-relaxed bg-kd-bg/40 border border-kd-border/50 rounded-lg px-3 py-2 font-mono">
          {fix}
        </div>
      </div>

      {reference && (
        <p className="text-[10px] text-kd-text-muted mb-3">
          Reference: <span className="text-kd-accent">{reference}</span>
        </p>
      )}

      <FixSuggestionPanel
        findingId={id}
        issue={issue}
        severity={severity}
        filePath={file}
        aiFix={ai_fix}
        onFixUpdated={onInteraction ? () => onInteraction() : undefined}
      />

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="text-xs text-kd-text-muted border-t border-kd-border/50 pt-3 mb-3"
        >
          Expanded analysis: This finding was generated by the {cat.label} agent
          with {confidencePercent}% confidence based on static diff analysis and
          pattern matching against known vulnerability signatures.
        </motion.div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-kd-border/40">
        <button
          type="button"
          onClick={() => act("thumbs_up")}
          className={`p-1.5 rounded-lg hover:bg-kd-card transition-colors ${localInteractions.includes("thumbs_up") ? "text-kd-success" : "text-kd-text-muted"}`}
          title="Helpful"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => act("thumbs_down")}
          className={`p-1.5 rounded-lg hover:bg-kd-card transition-colors ${localInteractions.includes("thumbs_down") ? "text-kd-critical" : "text-kd-text-muted"}`}
          title="Not helpful"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => act("mark_fixed")}
          className="p-1.5 rounded-lg hover:bg-kd-card text-kd-text-muted hover:text-kd-success transition-colors"
          title="Mark fixed"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => act("dismiss")}
          className="p-1.5 rounded-lg hover:bg-kd-card text-kd-text-muted hover:text-kd-critical transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={copyFix}
          className="p-1.5 rounded-lg hover:bg-kd-card text-kd-text-muted transition-colors"
          title="Copy recommendation"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={createGitHubIssue}
          className="p-1.5 rounded-lg hover:bg-kd-card text-kd-text-muted transition-colors"
          title="Create GitHub issue"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() =>
            toast("Jira integration — connect in Settings → Integrations")
          }
          className="text-[10px] px-2 py-1 rounded-lg border border-kd-border text-kd-text-muted hover:text-kd-text ml-auto"
        >
          Jira
        </button>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg hover:bg-kd-card text-kd-text-muted"
        >
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </motion.div>
  );
}
