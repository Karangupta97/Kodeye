"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { ReviewAiFix } from "@/lib/review-api";
import {
  generateFindingFix,
  postGitHubFixSuggestion,
  updateFixStatus,
} from "@/lib/review-api";

const LOADING_MESSAGES = [
  "Analyzing context…",
  "Building recommendation…",
  "Creating patch…",
  "Validating fix…",
];

interface FixSuggestionPanelProps {
  findingId: string;
  issue: string;
  severity: string;
  filePath: string;
  aiFix?: ReviewAiFix | null;
  onFixUpdated?: (fix: ReviewAiFix | null) => void;
}

const confidenceClass = (pct: number) => {
  if (pct >= 75) return "fix-confidence-high";
  if (pct >= 60) return "fix-confidence-medium";
  return "fix-confidence-low";
};

const buildPatchText = (original: string, suggested: string) => {
  const origLines = original.split("\n");
  const sugLines = suggested.split("\n");
  const lines: string[] = [];
  for (const line of origLines) {
    lines.push(`-${line}`);
  }
  for (const line of sugLines) {
    lines.push(`+${line}`);
  }
  return lines.join("\n");
};

export default function FixSuggestionPanel({
  findingId,
  issue,
  severity,
  filePath,
  aiFix: initialFix,
  onFixUpdated,
}: FixSuggestionPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [fix, setFix] = useState<ReviewAiFix | null>(initialFix ?? null);
  const [generating, setGenerating] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [postingGh, setPostingGh] = useState(false);

  useEffect(() => {
    setFix(initialFix ?? null);
  }, [initialFix]);

  const pct = fix ? fix.confidence_percent : 0;

  const patchText = useMemo(() => {
    if (!fix) return "";
    return buildPatchText(fix.original_code, fix.suggested_code);
  }, [fix]);

  const runGenerate = useCallback(
    async (force = false) => {
      setGenerating(true);
      let idx = 0;
      const interval = setInterval(() => {
        idx = (idx + 1) % LOADING_MESSAGES.length;
        setLoadingMsg(LOADING_MESSAGES[idx]);
      }, 1400);

      try {
        const data = await generateFindingFix(findingId, force);
        const mapped: ReviewAiFix = {
          id: data.id,
          original_code: data.original_code,
          suggested_code: data.suggested_code,
          explanation: data.explanation,
          why_fix_works: data.why_fix_works,
          confidence: data.confidence,
          confidence_percent: data.confidence_percent,
          confidence_label: data.confidence_label,
          start_line: data.start_line,
          end_line: data.end_line,
          status: data.status,
        };
        setFix(mapped);
        setExpanded(true);
        onFixUpdated?.(mapped);
        toast.success("Fix generated");
      } catch {
        toast.error("Could not generate a fix for this finding");
        onFixUpdated?.(null);
      } finally {
        clearInterval(interval);
        setGenerating(false);
      }
    },
    [findingId, onFixUpdated]
  );

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  };

  const exportFix = () => {
    if (!fix) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            finding_id: findingId,
            issue,
            severity,
            file: filePath,
            ...fix,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kodeye-fix-${findingId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Fix exported");
  };

  const postToGitHub = async () => {
    if (!fix) return;
    setPostingGh(true);
    try {
      const res = await postGitHubFixSuggestion(findingId);
      if (res.url) window.open(res.url, "_blank");
      toast.success("Posted GitHub suggestion");
    } catch {
      toast.error("Failed to post GitHub suggestion");
    } finally {
      setPostingGh(false);
    }
  };

  const setStatus = async (status: "applied" | "rejected") => {
    try {
      const data = await updateFixStatus(findingId, status);
      const mapped: ReviewAiFix = {
        id: data.id,
        original_code: data.original_code,
        suggested_code: data.suggested_code,
        explanation: data.explanation,
        why_fix_works: data.why_fix_works,
        confidence: data.confidence,
        confidence_percent: data.confidence_percent,
        confidence_label: data.confidence_label,
        status: data.status,
      };
      setFix(mapped);
      onFixUpdated?.(mapped);
      toast.success(status === "applied" ? "Marked as applied" : "Marked as rejected");
    } catch {
      toast.error("Could not update fix status");
    }
  };

  return (
    <div className="fix-suggestion-panel mt-3 border border-kd-border/60 rounded-xl overflow-hidden bg-kd-bg/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-kd-card/40 transition-colors"
      >
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-kd-glow">
          <Sparkles className="w-3.5 h-3.5" />
          {fix ? "Suggested Fix" : "AI Fix Suggestion"}
        </span>
        <span className="flex items-center gap-2">
          {fix && (
            <span
              className={`fix-confidence-badge text-[10px] font-bold px-2 py-0.5 rounded-full ${confidenceClass(pct)}`}
            >
              {pct}% · {fix.confidence_label}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-kd-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-kd-text-muted" />
          )}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-kd-border/50"
          >
            <div className="p-3 space-y-3">
              {generating && (
                <div className="flex items-center gap-2 text-xs text-kd-text-muted py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-kd-glow" />
                  {loadingMsg}
                </div>
              )}

              {!generating && !fix && (
                <div className="text-center py-4 space-y-3">
                  <p className="text-xs text-kd-text-muted">
                    No AI fix yet. Generate a code suggestion from this finding.
                  </p>
                  <button
                    type="button"
                    onClick={() => runGenerate(false)}
                    className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Fix
                  </button>
                </div>
              )}

              {!generating && fix && pct < 60 && (
                <p className="text-[11px] text-kd-warning bg-kd-warning/10 border border-kd-warning/30 rounded-lg px-2 py-1.5">
                  Lower confidence — review manually before applying.
                </p>
              )}

              {!generating && fix && (
                <>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-kd-text-muted mb-1">
                      {issue}
                    </p>
                    <p className="text-xs text-kd-text-muted leading-relaxed">
                      {fix.explanation}
                    </p>
                  </div>

                  <div className="fix-diff-view rounded-lg overflow-hidden border border-kd-border/60 font-mono text-xs">
                    <div className="fix-diff-header px-3 py-1.5 text-[10px] uppercase tracking-wider text-kd-text-muted border-b border-kd-border/50 flex justify-between">
                      <span>Original</span>
                      <span>Suggested</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {fix.original_code.split("\n").map((line, i) => (
                        <div key={`o-${i}`} className="fix-diff-line fix-diff-del flex">
                          <span className="fix-diff-gutter shrink-0 w-8 text-right pr-2 text-kd-text-muted/60 select-none">
                            {fix.start_line != null ? fix.start_line + i : i + 1}
                          </span>
                          <span className="fix-diff-prefix shrink-0 w-4 text-kd-critical">−</span>
                          <code className="flex-1 pr-2 whitespace-pre-wrap break-all">{line}</code>
                        </div>
                      ))}
                      {fix.suggested_code.split("\n").map((line, i) => (
                        <div key={`s-${i}`} className="fix-diff-line fix-diff-add flex">
                          <span className="fix-diff-gutter shrink-0 w-8 text-right pr-2 text-kd-text-muted/60 select-none">
                            {fix.end_line != null
                              ? fix.end_line - fix.suggested_code.split("\n").length + i + 1
                              : i + 1}
                          </span>
                          <span className="fix-diff-prefix shrink-0 w-4 text-kd-success">+</span>
                          <code className="flex-1 pr-2 whitespace-pre-wrap break-all">{line}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  {fix.why_fix_works && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-kd-text-muted mb-1">
                        Why this fix works
                      </p>
                      <p className="text-xs text-kd-text-muted leading-relaxed">
                        {fix.why_fix_works}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => copyText(fix.suggested_code, "suggested code")}
                      className="fix-action-btn"
                      title="Copy fix"
                    >
                      <Copy className="w-3 h-3" />
                      Copy fix
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(patchText, "patch")}
                      className="fix-action-btn"
                      title="Copy patch"
                    >
                      <Copy className="w-3 h-3" />
                      Copy patch
                    </button>
                    <button
                      type="button"
                      onClick={postToGitHub}
                      disabled={postingGh}
                      className="fix-action-btn"
                    >
                      {postingGh ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden
                        >
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                      )}
                      GitHub suggestion
                    </button>
                    <button type="button" onClick={exportFix} className="fix-action-btn">
                      <Download className="w-3 h-3" />
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("applied")}
                      className="fix-action-btn text-kd-success"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Applied
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("rejected")}
                      className="fix-action-btn text-kd-critical"
                    >
                      <XCircle className="w-3 h-3" />
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => runGenerate(true)}
                      className="fix-action-btn ml-auto"
                    >
                      Regenerate
                    </button>
                  </div>

                  <p className="text-[10px] text-kd-text-muted/80 italic">
                    Suggestions only — never auto-applied. Human approval required.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
