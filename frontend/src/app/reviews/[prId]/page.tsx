"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  RefreshCw,
  Share2,
  Download,
  ExternalLink,
  Zap,
  FileText,
  Shield,
  GitCommit,
  CheckCircle,
  Search,
  Filter,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useReviewBundle } from "@/hooks/useReviewBundle";
import {
  reanalyzeReview,
  shareReview,
  exportReviewUrl,
  type ReviewFinding,
} from "@/lib/review-api";
import ReviewAnalyticsPanel from "@/components/review/ReviewAnalyticsPanel";
import ReviewProcessing from "@/components/review/ReviewProcessing";
import ReviewFilesPanel from "@/components/review/ReviewFilesPanel";
import FindingCard from "@/components/review/FindingCard";
import { mergeReviewFiles } from "@/lib/review-bundle-utils";
import FixSuggestionsTab from "@/components/review/FixSuggestionsTab";
import ReviewDebugPanel from "@/components/review/ReviewDebugPanel";

type Tab =
  | "overview"
  | "files"
  | "ai-review"
  | "fix-suggestions"
  | "commits"
  | "checks";

export default function ReviewPage() {
  const params = useParams<{ prId: string }>();
  const prId = params.prId;
  const { bundle, loading, error, refreshing, reload } = useReviewBundle(prId);

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);

  const isProcessing = Boolean(
    isReanalyzing ||
      bundle?.ai_review_status === "processing" ||
      (bundle?.progress?.state &&
        !["idle", "completed", "failed"].includes(bundle.progress.state))
  );

  const filteredFindings = useMemo(() => {
    if (!bundle) return [];
    return bundle.findings.filter((f) => {
      if (severityFilter && f.severity !== severityFilter) return false;
      if (categoryFilter && f.category !== categoryFilter) return false;
      if (agentFilter) {
        const agentCats: Record<string, string[]> = {
          security: ["security"],
          bug: ["bug"],
          performance: ["performance"],
          style: ["style"],
          architecture: ["architecture"],
        };
        if (!agentCats[agentFilter]?.includes(f.category)) return false;
      }
      if (selectedFile && f.file !== selectedFile) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          f.issue.toLowerCase().includes(q) ||
          f.file.toLowerCase().includes(q) ||
          f.why.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bundle, severityFilter, categoryFilter, agentFilter, selectedFile, searchQuery]);

  const filesWithIssues = useMemo(() => {
    if (!bundle) return [];
    const map = new Map<
      string,
      { critical: number; high: number; medium: number; low: number }
    >();
    for (const f of bundle.findings) {
      const entry = map.get(f.file) || {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };
      const s = f.severity as keyof typeof entry;
      if (s in entry) entry[s]++;
      map.set(f.file, entry);
    }
    return Array.from(map.entries()).map(([file, counts]) => ({
      file,
      ...counts,
      total: counts.critical + counts.high + counts.medium + counts.low,
    }));
  }, [bundle]);

  const mergedFiles = useMemo(
    () => (bundle ? mergeReviewFiles(bundle.files, bundle.findings) : []),
    [bundle]
  );

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      await reanalyzeReview(prId);
      toast.success("AI analysis started — progress updates live");
    } catch {
      toast.error("Failed to start analysis");
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleExport = async (fmt: "json" | "markdown" | "pdf") => {
    try {
      const url = await exportReviewUrl(prId, fmt);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Export failed — sign in and try again");
    }
  };

  const handleShare = async () => {
    try {
      const { share_url } = await shareReview(prId);
      await navigator.clipboard.writeText(share_url);
      toast.success("Share link copied");
    } catch {
      toast.error("Share failed");
    }
  };

  const scrollToFile = (filename: string, fileId?: string) => {
    setSelectedFile(filename);
    setActiveTab("files");
    setTimeout(() => {
      if (fileId) {
        document
          .getElementById(`file-${fileId}`)
          ?.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  if (loading) {
    return (
      <div className="review-page-layout p-6">
        <div className="flex-1 space-y-4">
          <div className="shimmer h-12 rounded-xl" />
          <div className="shimmer h-32 rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            <div className="shimmer h-64 rounded-xl col-span-2" />
            <div className="shimmer h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="review-page-layout p-8 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md">
          <Shield className="w-12 h-12 text-kd-critical mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-kd-text mb-2">
            {error || "Pull request not found"}
          </h2>
          <p className="text-sm text-kd-text-muted mb-6">
            The review could not be loaded. Check that the PR exists and the
            backend is running.
          </p>
          <Link href="/pull-requests" className="btn-primary text-sm">
            Back to Pull Requests
          </Link>
        </div>
      </div>
    );
  }

  const { pull_request: pr, repository: repo } = bundle;
  const githubUrl =
    pr.github_url ||
    `https://github.com/${repo.full_name}/pull/${pr.pr_number}`;

  const hasActiveFilters = Boolean(
    severityFilter ||
      categoryFilter ||
      agentFilter ||
      selectedFile ||
      searchQuery
  );

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: Shield },
    { key: "files", label: "Files", icon: FileText },
    { key: "ai-review", label: "AI Review", icon: Zap },
    {
      key: "fix-suggestions",
      label: "Fix Suggestions",
      icon: Sparkles,
    },
    { key: "commits", label: "Commits", icon: GitCommit },
    { key: "checks", label: "Checks", icon: CheckCircle },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="review-page-layout"
    >
      {/* Header */}
      <header className="review-header border-b border-kd-border bg-kd-surface/40 backdrop-blur-xl px-4 sm:px-6 py-4 shrink-0">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-kd-text-muted mb-3">
          <Link href="/repositories" className="hover:text-kd-text">
            {repo.repo_name}
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/pull-requests" className="hover:text-kd-text">
            Pull Requests
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-kd-glow">#{pr.pr_number}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3 min-w-0">
            <img
              src={pr.author_avatar_url}
              alt=""
              className="w-11 h-11 rounded-full border border-kd-border shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-kd-text leading-tight">
                {pr.title}
              </h1>
              <p className="text-sm text-kd-text-muted mt-1">
                <span className="text-kd-text font-medium">{pr.author}</span>{" "}
                wants to merge{" "}
                <span className="font-mono text-kd-accent">
                  {pr.commits_count} commit{pr.commits_count !== 1 ? "s" : ""}
                </span>
              </p>
              <p className="text-xs text-kd-text-muted mt-1 font-mono">
                from:{" "}
                <span className="text-kd-glow">{pr.branch}</span> into:{" "}
                <span className="text-kd-text">{pr.base_branch}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-kd-border text-kd-text-muted">
                  {repo.full_name}
                </span>
                {bundle.fix_suggestions &&
                  bundle.findings.length > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-kd-glow/40 text-kd-glow bg-kd-glow/10">
                      {bundle.findings.length} issues ·{" "}
                      {bundle.fix_suggestions.fixes_generated} fixes ·{" "}
                      {bundle.fix_suggestions.high_confidence} high confidence
                    </span>
                  )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-kd-border capitalize">
              {pr.status}
            </span>
            <button
              type="button"
              onClick={handleReanalyze}
              disabled={isProcessing}
              className="btn-primary text-xs py-2 px-3"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin" : ""}`}
              />
              Re-analyze
            </button>
            <button type="button" onClick={handleShare} className="btn-ghost text-xs py-2">
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
            <div className="relative group">
              <button type="button" className="btn-ghost text-xs py-2">
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <div className="hidden group-hover:block absolute right-0 top-full mt-1 z-50 dropdown-menu py-1 min-w-[120px]">
                {(["json", "markdown", "pdf"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleExport(fmt)}
                    className="dropdown-item text-xs capitalize w-full text-left"
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs py-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              GitHub
            </a>
            <button
              type="button"
              onClick={() => reload()}
              disabled={refreshing}
              className="btn-ghost text-xs py-2"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="flex gap-1 mt-4 overflow-x-auto border-b border-kd-border -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "border-kd-glow text-kd-glow"
                    : "border-transparent text-kd-text-muted hover:text-kd-text"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="review-body flex-1 min-h-0 flex overflow-hidden">
        {/* Center workspace */}
        <div className="review-workspace flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <AnimatePresence>
            {isProcessing && (
              <ReviewProcessing isProcessing={isProcessing} />
            )}
          </AnimatePresence>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-kd-text-muted" />
              <input
                type="search"
                placeholder="Search findings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="kd-input w-full pl-8 pr-3 py-2 text-sm"
              />
            </div>
            {(["critical", "high", "medium", "low"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setSeverityFilter(severityFilter === s ? null : s)
                }
                className={`filter-btn capitalize ${severityFilter === s ? "filter-btn-active" : ""}`}
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSeverityFilter(null);
                setCategoryFilter(null);
                setAgentFilter(null);
                setSelectedFile(null);
                setSearchQuery("");
              }}
              className="filter-btn"
            >
              <Filter className="w-3 h-3" />
              Clear
            </button>
          </div>

          <ReviewDebugPanel bundle={bundle} />

          {activeTab === "overview" && (
            <OverviewTab
              bundle={bundle}
              mergedFiles={mergedFiles}
              findings={filteredFindings}
              filesWithIssues={filesWithIssues}
              onFileClick={scrollToFile}
              githubUrl={githubUrl}
              onReload={reload}
            />
          )}

          {activeTab === "files" && (
            <ReviewFilesPanel
              bundle={bundle}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              severityFilter={severityFilter}
              loading={refreshing}
            />
          )}

          {activeTab === "ai-review" && (
            <AIReviewTab
              bundle={bundle}
              findings={filteredFindings}
              hasActiveFilters={hasActiveFilters}
              githubUrl={githubUrl}
              onReload={reload}
            />
          )}

          {activeTab === "fix-suggestions" && (
            <FixSuggestionsTab
              bundle={bundle}
              findings={bundle.findings}
              onReload={reload}
            />
          )}

          {activeTab === "commits" && <CommitsTab pr={pr} />}
          {activeTab === "checks" && <ChecksTab bundle={bundle} />}

          {/* Mobile / tablet analytics */}
          <details className="xl:hidden glass-card p-4 group">
            <summary className="text-sm font-semibold text-kd-text cursor-pointer list-none flex items-center justify-between">
              Analytics & insights
              <span className="text-xs text-kd-text-muted group-open:hidden">Show</span>
            </summary>
            <div className="mt-4 pt-4 border-t border-kd-border">
              <ReviewAnalyticsPanel
                bundle={bundle}
                loading={refreshing}
                activeSeverity={severityFilter}
                activeCategory={categoryFilter}
                activeAgent={agentFilter}
                onSeverityFilter={setSeverityFilter}
                onCategoryFilter={setCategoryFilter}
                onAgentFilter={(id) => {
                  setAgentFilter(id);
                  if (id) setActiveTab("ai-review");
                }}
              />
            </div>
          </details>
        </div>

        {/* Right analytics — desktop */}
        <div className="review-analytics-wrap hidden xl:block w-[22rem] shrink-0 border-l border-kd-border p-4">
          <ReviewAnalyticsPanel
            bundle={bundle}
            loading={refreshing}
            activeSeverity={severityFilter}
            activeCategory={categoryFilter}
            activeAgent={agentFilter}
            onSeverityFilter={setSeverityFilter}
            onCategoryFilter={setCategoryFilter}
            onAgentFilter={(id) => {
              setAgentFilter(id);
              if (id) setActiveTab("ai-review");
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function OverviewTab({
  bundle,
  mergedFiles,
  findings,
  filesWithIssues,
  onFileClick,
  githubUrl,
  onReload,
}: {
  bundle: NonNullable<ReturnType<typeof useReviewBundle>["bundle"]>;
  mergedFiles: ReturnType<typeof mergeReviewFiles>;
  findings: ReviewFinding[];
  filesWithIssues: Array<{
    file: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }>;
  onFileClick: (f: string, id?: string) => void;
  githubUrl: string;
  onReload: () => void;
}) {
  if (bundle.ai_review_status === "pending") {
    return (
      <div className="glass-card p-10 text-center">
        <Zap className="w-12 h-12 text-kd-primary mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-kd-text">No AI review yet</h3>
        <p className="text-sm text-kd-text-muted mt-2 mb-6">
          Run analysis to detect security issues, bugs, and performance problems.
        </p>
      </div>
    );
  }

  if (bundle.findings.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <Shield className="w-10 h-10 text-kd-success mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-kd-text">Review complete</h3>
        <p className="text-sm text-kd-text-muted mt-2">
          No issues were found in this pull request.
        </p>
      </div>
    );
  }

  return (
    <>
      {filesWithIssues.length > 0 && (
        <div className="rounded-xl border border-kd-border bg-kd-surface p-4">
          <h3 className="text-sm font-semibold text-kd-text mb-3">
            Files with issues
          </h3>
          <div className="space-y-2">
            {filesWithIssues.map((item) => {
              const fileRecord = mergedFiles.find(
                (f) => f.filename === item.file
              );
              return (
                <button
                  key={item.file}
                  type="button"
                  onClick={() => onFileClick(item.file, fileRecord?.id)}
                  className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg bg-kd-surface hover:bg-kd-card border border-kd-border text-left transition-colors"
                >
                  <code className="text-xs text-kd-primary truncate">{item.file}</code>
                  <div className="flex gap-2 shrink-0 text-[10px]">
                    {item.critical > 0 && (
                      <span className="text-kd-critical">{item.critical} crit</span>
                    )}
                    {item.high > 0 && (
                      <span className="text-orange-400">{item.high} high</span>
                    )}
                    {item.medium > 0 && (
                      <span className="text-kd-warning">{item.medium} med</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="space-y-3">
        {findings.slice(0, 5).map((f, i) => (
          <FindingCard
            key={f.id}
            {...f}
            githubUrl={githubUrl}
            index={i}
            onInteraction={onReload}
          />
        ))}
        {findings.length > 5 && (
          <p className="text-xs text-center text-kd-text-muted">
            +{findings.length - 5} more in AI Review tab
          </p>
        )}
      </div>
    </>
  );
}

function AIReviewTab({
  bundle,
  findings,
  hasActiveFilters,
  githubUrl,
  onReload,
}: {
  bundle: NonNullable<ReturnType<typeof useReviewBundle>["bundle"]>;
  findings: ReviewFinding[];
  hasActiveFilters: boolean;
  githubUrl: string;
  onReload: () => void;
}) {
  if (bundle.ai_review_status === "pending") {
    return (
      <div className="glass-card p-10 text-center">
        <Zap className="w-10 h-10 text-kd-primary mx-auto mb-3" />
        <p className="text-sm font-medium text-kd-text">No AI review yet</p>
        <p className="text-xs text-kd-text-muted mt-1">
          Click Re-analyze to run the multi-agent review.
        </p>
      </div>
    );
  }

  if (findings.length === 0 && hasActiveFilters) {
    return (
      <div className="glass-card p-10 text-center">
        <Filter className="w-10 h-10 text-kd-text-muted mx-auto mb-3" />
        <p className="text-sm font-medium text-kd-text">No matching findings</p>
        <p className="text-xs text-kd-text-muted mt-1">
          Clear filters to see all {bundle.findings.length} issue
          {bundle.findings.length !== 1 ? "s" : ""}.
        </p>
      </div>
    );
  }

  if (bundle.findings.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <Shield className="w-10 h-10 text-kd-success mx-auto mb-3" />
        <p className="text-sm font-medium text-kd-text">No findings</p>
        <p className="text-xs text-kd-text-muted mt-1">
          The review completed with a clean bill of health.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {findings.map((f, i) => (
        <FindingCard
          key={f.id}
          {...f}
          githubUrl={githubUrl}
          index={i}
          onInteraction={onReload}
        />
      ))}
    </div>
  );
}

function CommitsTab({
  pr,
}: {
  pr: { commits_count: number; branch: string; author: string; created_at: string };
}) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold text-kd-text mb-4">
        {pr.commits_count} commit{pr.commits_count !== 1 ? "s" : ""} on{" "}
        <span className="font-mono text-kd-glow">{pr.branch}</span>
      </h3>
      <div className="flex gap-3 p-3 rounded-lg border border-kd-border bg-kd-bg/40">
        <div className="w-8 h-8 rounded-full bg-kd-primary/20 flex items-center justify-center text-xs font-bold text-kd-glow">
          {pr.author[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-sm text-kd-text">
            Latest changes on <span className="font-mono">{pr.branch}</span>
          </p>
          <p className="text-xs text-kd-text-muted mt-1">
            {new Date(pr.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function ChecksTab({
  bundle,
}: {
  bundle: NonNullable<ReturnType<typeof useReviewBundle>["bundle"]>;
}) {
  const checks = [
    {
      name: "Kodeye Security Scan",
      status: bundle.risk_score.security_score > 50 ? "failure" : "success",
    },
    {
      name: "Kodeye Bug Analysis",
      status:
        bundle.findings.filter((f) => f.category === "bug").length > 0
          ? "failure"
          : "success",
    },
    {
      name: "Kodeye Performance",
      status: bundle.risk_score.performance_score > 50 ? "failure" : "success",
    },
    {
      name: "Risk Score Gate",
      status: bundle.risk_score.overall_score > 70 ? "failure" : "success",
    },
  ];

  return (
    <div className="space-y-2">
      {checks.map((c) => (
        <div
          key={c.name}
          className="glass-card p-4 flex items-center justify-between"
        >
          <span className="text-sm text-kd-text">{c.name}</span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              c.status === "success"
                ? "bg-kd-success/15 text-kd-success"
                : "bg-kd-critical/15 text-kd-critical"
            }`}
          >
            {c.status === "success" ? "Passed" : "Failed"}
          </span>
        </div>
      ))}
    </div>
  );
}
