"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { FileCode, ChevronDown, Search, AlertTriangle } from "lucide-react";
import type { ReviewBundle } from "@/lib/review-api";
import { fetchPullRequestFiles } from "@/lib/api";
import {
  mergeReviewFiles,
  countFindingsByFile,
  getFileLanguage,
} from "@/lib/review-bundle-utils";
import SeverityBadge from "./SeverityBadge";

const DiffViewer = dynamic(() => import("./DiffViewer"), {
  loading: () => <div className="shimmer h-48 rounded-lg m-4" />,
  ssr: false,
});

interface Props {
  bundle: ReviewBundle;
  selectedFile: string | null;
  onSelectFile: (filename: string | null) => void;
  severityFilter: string | null;
  loading?: boolean;
}

export default function ReviewFilesPanel({
  bundle,
  selectedFile,
  onSelectFile,
  severityFilter,
  loading,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(selectedFile);
  const [fileSearch, setFileSearch] = useState("");
  const [patchCache, setPatchCache] = useState<Map<string, string>>(new Map());
  const [loadingPatch, setLoadingPatch] = useState<string | null>(null);
  const loadedPatches = useRef(new Set<string>());

  const loadPatch = useCallback(
    async (filename: string) => {
      if (loadedPatches.current.has(filename)) return;
      loadedPatches.current.add(filename);
      setLoadingPatch(filename);
      try {
        const files = await fetchPullRequestFiles(bundle.pull_request.id, {
          includePatch: true,
          filename,
        });
        const match = files.find((f) => f.filename === filename);
        if (match?.patch) {
          setPatchCache((prev) => new Map(prev).set(filename, match.patch!));
        }
      } finally {
        setLoadingPatch(null);
      }
    },
    [bundle.pull_request.id]
  );

  const toggleExpand = (filename: string) => {
    setExpanded((prev) => (prev === filename ? null : filename));
    onSelectFile(filename);
    void loadPatch(filename);
  };

  const files = useMemo(
    () => mergeReviewFiles(bundle.files, bundle.findings),
    [bundle.files, bundle.findings]
  );

  const findingsByFile = useMemo(
    () => countFindingsByFile(bundle.findings),
    [bundle.findings]
  );

  const filteredFiles = useMemo(() => {
    let list = files;
    if (fileSearch.trim()) {
      const q = fileSearch.toLowerCase();
      list = list.filter((f) => f.filename.toLowerCase().includes(q));
    }
    if (selectedFile) {
      list = list.filter((f) => f.filename === selectedFile);
    }
    return list;
  }, [files, fileSearch, selectedFile]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="shimmer h-10 rounded-lg" />
        <div className="shimmer h-48 rounded-xl" />
        <div className="shimmer h-48 rounded-xl" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <FileCode className="w-10 h-10 text-kd-text-muted mx-auto mb-3" />
        <p className="text-sm font-medium text-kd-text">No changed files</p>
        <p className="text-xs text-kd-text-muted mt-2 max-w-sm mx-auto">
          Files are loaded from the PR webhook or GitHub when you open this
          page. If findings reference files, sync the PR from Pull Requests or
          re-run the review.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-0">
      <aside className="lg:w-64 shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-kd-text-muted" />
          <input
            type="search"
            placeholder="Search files..."
            value={fileSearch}
            onChange={(e) => setFileSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-kd-border bg-kd-bg/50 text-kd-text"
          />
        </div>
        <div className="max-h-[min(60vh,520px)] overflow-y-auto space-y-1 pr-1">
          {filteredFiles.map((f) => {
            const counts = findingsByFile.get(f.filename);
            const isActive =
              selectedFile === f.filename || expanded === f.filename;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleExpand(f.filename)}
                className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs transition-colors ${
                  isActive
                    ? "border-kd-glow/50 bg-kd-glow/10"
                    : "border-transparent hover:bg-kd-card/50"
                }`}
              >
                <code className="font-mono text-kd-accent block truncate">
                  {f.filename.split("/").pop()}
                </code>
                <span className="text-[10px] text-kd-text-muted">
                  {getFileLanguage(f.filename)}
                  {counts && counts.total > 0
                    ? ` · ${counts.total} issue${counts.total !== 1 ? "s" : ""}`
                    : ""}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex-1 min-w-0 space-y-4">
        {filteredFiles.map((file) => {
          const counts = findingsByFile.get(file.filename);
          const fileFindings = bundle.findings.filter((r) => {
            if (r.file !== file.filename) return false;
            if (severityFilter && r.severity !== severityFilter) return false;
            return true;
          });
          const isOpen = expanded === file.filename || filteredFiles.length === 1;
          const topSeverity = counts?.critical
            ? "critical"
            : counts?.high
              ? "high"
              : counts?.medium
                ? "medium"
                : counts?.low
                  ? "low"
                  : null;

          const comments = fileFindings.map((r) => ({
            line: r.line,
            severity: r.severity,
            issue: r.issue,
            why: r.why,
            fix: r.fix,
            confidence: r.confidence,
            category: r.category,
          }));

          return (
            <motion.article
              key={file.id}
              id={`file-${file.id}`}
              layout
              className="glass-card overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleExpand(file.filename)}
                className="w-full sticky top-0 z-10 flex flex-wrap items-center gap-3 p-4 border-b border-kd-border/50 bg-kd-card/95 backdrop-blur-sm text-left"
              >
                <ChevronDown
                  className={`w-4 h-4 text-kd-text-muted transition-transform ${
                    isOpen ? "" : "-rotate-90"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-kd-text truncate">
                    {file.filename}
                  </p>
                  <p className="text-[10px] text-kd-text-muted mt-0.5">
                    {getFileLanguage(file.filename)} · {file.status}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                  <span className="text-kd-success">+{file.additions}</span>
                  <span className="text-kd-critical">-{file.deletions}</span>
                </div>
                {topSeverity && counts && counts.total > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-kd-critical/10 text-kd-critical border border-kd-critical/30">
                    <AlertTriangle className="w-3 h-3" />
                    {counts.total} issue{counts.total !== 1 ? "s" : ""}
                  </span>
                )}
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    {fileFindings.length > 0 && (
                      <div className="px-4 py-3 border-b border-kd-border/40 space-y-2 bg-kd-bg/30">
                        <p className="text-[10px] uppercase tracking-wider text-kd-text-muted font-semibold">
                          Inline findings
                        </p>
                        {fileFindings.map((f) => (
                          <div
                            key={f.id}
                            id={`finding-${f.id}`}
                            className="flex items-start gap-2 text-xs"
                          >
                            <SeverityBadge severity={f.severity} />
                            <span className="text-kd-text-muted font-mono shrink-0">
                              L{f.line}
                            </span>
                            <span className="text-kd-text line-clamp-2">
                              {f.issue}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(() => {
                      const patch =
                        patchCache.get(file.filename) ?? file.patch ?? null;
                      if (loadingPatch === file.filename && !patch) {
                        return (
                          <div className="p-6">
                            <div className="shimmer h-48 rounded-lg" />
                          </div>
                        );
                      }
                      if (patch) {
                        return (
                          <DiffViewer
                            id={file.id}
                            filename={file.filename}
                            patch={patch}
                            comments={comments}
                          />
                        );
                      }
                      return (
                        <div className="p-6 text-sm text-kd-text-muted text-center">
                          <p>No diff preview stored for this file.</p>
                          <p className="text-xs mt-2">
                            Re-sync the PR or open on GitHub to view the full
                            diff.
                          </p>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
