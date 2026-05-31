import { logger } from "./logger";
import { listPullRequestFiles, replacePullRequestFiles } from "../services/pullRequestFiles.service";
import { getPullRequestFiles as fetchGHFiles } from "../github/pr.service";
import { getGeminiModel } from "../config/env";

export interface BundleFileRow {
  id: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
  raw_url: string | null;
  blob_url: string | null;
}

export const resolveReviewFiles = async (input: {
  prId: string;
  installationId: number;
  owner: string;
  repoName: string;
  pullNumber: number;
  findings: Array<{ file: string }>;
}): Promise<BundleFileRow[]> => {
  let files = (await listPullRequestFiles(input.prId)) as BundleFileRow[];

  if (!files.length) {
    try {
      const ghFiles = await fetchGHFiles({
        installationId: input.installationId,
        owner: input.owner,
        repo: input.repoName,
        pullNumber: input.pullNumber,
      });

      if (ghFiles.length) {
        const records = ghFiles.map((file: {
          filename: string;
          status: string;
          additions: number;
          deletions: number;
          changes: number;
          patch?: string;
          raw_url?: string;
          blob_url?: string;
        }) => ({
          pull_request_id: input.prId,
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch || null,
          raw_url: file.raw_url || null,
          blob_url: file.blob_url || null,
        }));

        files = (await replacePullRequestFiles(input.prId, records)) as BundleFileRow[];
        logger.info("Review bundle: hydrated files from GitHub", {
          prId: input.prId,
          count: files.length,
        });
      }
    } catch (error) {
      logger.warn("Review bundle: GitHub files fallback failed", {
        prId: input.prId,
        error: (error as Error).message,
      });
    }
  }

  if (!files.length && input.findings.length) {
    const seen = new Set<string>();
    files = [];
    for (const finding of input.findings) {
      if (!finding.file || seen.has(finding.file)) continue;
      seen.add(finding.file);
      files.push({
        id: `synthetic-${files.length + 1}`,
        filename: finding.file,
        status: "modified",
        additions: 0,
        deletions: 0,
        changes: 0,
        patch: null,
        raw_url: null,
        blob_url: null,
      });
    }
    logger.info("Review bundle: synthesized files from findings", {
      prId: input.prId,
      count: files.length,
    });
  }

  return files;
};

export interface DisplayTimelineEvent {
  id: string;
  label: string;
  detail?: string | null;
  timestamp?: string;
  status: string;
  event_type: string;
  duration_ms?: number;
  icon?: string;
}

const EVENT_ICONS: Record<string, string> = {
  review_started: "🚀",
  ai_review_started: "🤖",
  webhook_received: "📡",
  files_fetched: "📁",
  security_complete: "🛡️",
  security_agent_complete: "🛡️",
  bug_complete: "🐛",
  bug_agent_complete: "🐛",
  performance_complete: "⚡",
  performance_agent_complete: "⚡",
  style_complete: "✨",
  style_agent_complete: "✨",
  architecture_complete: "🏗️",
  architecture_agent_complete: "🏗️",
  risk_score_generated: "📊",
  github_comment_posted: "💬",
  fix_suggestions_generated: "🔧",
  review_completed: "✅",
};

const AGENT_EVENT_MAP: Record<
  string,
  { event_type: string; label: string; icon: string }
> = {
  security: {
    event_type: "security_agent_complete",
    label: "Security Agent Completed",
    icon: "🛡️",
  },
  bug: {
    event_type: "bug_agent_complete",
    label: "Bug Agent Completed",
    icon: "🐛",
  },
  performance: {
    event_type: "performance_agent_complete",
    label: "Performance Agent Completed",
    icon: "⚡",
  },
  style: {
    event_type: "style_agent_complete",
    label: "Code Style Agent Completed",
    icon: "✨",
  },
  architecture: {
    event_type: "architecture_agent_complete",
    label: "Architecture Agent Completed",
    icon: "🏗️",
  },
};

export const buildDisplayTimeline = (input: {
  persistedEvents: Array<{
    id?: string;
    event_type: string;
    label: string;
    detail?: string | null;
    status: string;
    created_at?: string;
  }>;
  seededEvents: Array<{
    id?: string;
    event_type: string;
    label: string;
    detail?: string | null;
    status: string;
    created_at?: string;
  }>;
  agents: Array<{
    id: string;
    name: string;
    status: string;
    findingsCount: number;
    executionTimeMs: number;
  }>;
  fixStats: {
    fixes_generated: number;
    total?: number;
  };
  hasReview: boolean;
  prCreatedAt: string;
}): DisplayTimelineEvent[] => {
  const base = input.persistedEvents.length
    ? input.persistedEvents
    : input.seededEvents;

  const byType = new Map<string, DisplayTimelineEvent>();

  const upsert = (event: DisplayTimelineEvent) => {
    byType.set(event.event_type, event);
  };

  for (const e of base) {
    upsert({
      id: e.id || e.event_type,
      event_type: e.event_type,
      label: e.label,
      detail: e.detail,
      timestamp: e.created_at,
      status: e.status === "running" ? "active" : "done",
      icon: EVENT_ICONS[e.event_type] || "•",
    });
  }

  if (!byType.has("review_started") && !byType.has("ai_review_started")) {
    upsert({
      id: "review_started",
      event_type: "review_started",
      label: "Review Started",
      detail: "Multi-agent analysis pipeline",
      timestamp: input.prCreatedAt,
      status: input.hasReview ? "done" : "active",
      icon: "🚀",
    });
  }

  for (const agent of input.agents) {
    const def = AGENT_EVENT_MAP[agent.id];
    if (!def) continue;
    if (byType.has(def.event_type) || byType.has(`${agent.id}_complete`)) continue;

    upsert({
      id: def.event_type,
      event_type: def.event_type,
      label: def.label,
      detail:
        agent.findingsCount > 0
          ? `${agent.findingsCount} finding(s)`
          : "No issues detected",
      status: agent.status === "completed" ? "done" : "pending",
      duration_ms: agent.executionTimeMs,
      icon: def.icon,
    });
  }

  if (input.hasReview && !byType.has("risk_score_generated")) {
    upsert({
      id: "risk_score_generated",
      event_type: "risk_score_generated",
      label: "Risk Score Generated",
      status: "done",
      icon: "📊",
    });
  }

  if (input.fixStats.fixes_generated > 0 && !byType.has("fix_suggestions_generated")) {
    upsert({
      id: "fix_suggestions_generated",
      event_type: "fix_suggestions_generated",
      label: "Fix Suggestions Generated",
      detail: `${input.fixStats.fixes_generated} AI fix(es)`,
      status: "done",
      icon: "🔧",
    });
  }

  if (input.hasReview && !byType.has("review_completed")) {
    upsert({
      id: "review_completed",
      event_type: "review_completed",
      label: "Review Finished",
      status: "done",
      icon: "✅",
    });
  }

  const ORDER = [
    "review_started",
    "webhook_received",
    "files_fetched",
    "ai_review_started",
    "security_agent_complete",
    "security_complete",
    "bug_agent_complete",
    "performance_agent_complete",
    "style_agent_complete",
    "architecture_agent_complete",
    "risk_score_generated",
    "github_comment_posted",
    "fix_suggestions_generated",
    "review_completed",
  ];

  const orderIndex = (type: string) => {
    const idx = ORDER.indexOf(type);
    return idx === -1 ? 999 : idx;
  };

  return Array.from(byType.values()).sort((a, b) => {
    const o = orderIndex(a.event_type) - orderIndex(b.event_type);
    if (o !== 0) return o;
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return ta - tb;
  });
};

export const buildReviewMetadata = (input: {
  repositoryFullName: string;
  branch: string;
  baseBranch: string;
  commitCount: number;
  files: BundleFileRow[];
  riskScoreCreatedAt?: string | null;
  firstFindingAt?: string | null;
  timeline: DisplayTimelineEvent[];
}) => {
  const linesAdded = input.files.reduce((s, f) => s + (f.additions || 0), 0);
  const linesRemoved = input.files.reduce((s, f) => s + (f.deletions || 0), 0);

  const started = input.timeline[0]?.timestamp
    ? new Date(input.timeline[0].timestamp).getTime()
    : null;
  const finished = input.timeline[input.timeline.length - 1]?.timestamp
    ? new Date(input.timeline[input.timeline.length - 1].timestamp!).getTime()
    : null;

  let reviewDurationMs: number | null = null;
  if (started != null && finished != null && finished >= started) {
    reviewDurationMs = finished - started;
  }

  return {
    repository: input.repositoryFullName,
    branch: input.branch,
    base_branch: input.baseBranch,
    commit_count: input.commitCount,
    files_changed: input.files.length,
    lines_added: linesAdded,
    lines_removed: linesRemoved,
    review_duration_ms: reviewDurationMs,
    ai_model: getGeminiModel(),
    reviewed_at:
      input.riskScoreCreatedAt ||
      input.firstFindingAt ||
      new Date().toISOString(),
  };
};
