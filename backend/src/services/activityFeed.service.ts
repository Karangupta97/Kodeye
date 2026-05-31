import { getServiceDB } from "../db/supabase";
import { listWebhookLogs } from "./webhookLogs.service";
import { logger } from "../utils/logger";

export type ActivityDotColor = "green" | "amber" | "red" | "muted";

export interface ActivityFeedItem {
  id: string;
  source: "webhook" | "review";
  icon: string;
  title: string;
  subtitle: string;
  dot_color: ActivityDotColor;
  group_key: string;
  group_label: string;
  created_at: string;
}

const repoShortName = (repository: string | null) => {
  if (!repository) return "Repository";
  const parts = repository.split("/");
  return parts[parts.length - 1] || repository;
};

const extractPrNumber = (payload: unknown): number | null => {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const pr = p.pull_request as Record<string, unknown> | undefined;
  if (pr && typeof pr.number === "number") return pr.number;
  if (typeof p.number === "number") return p.number;
  return null;
};

const buildSubtitle = (repository: string | null, prNumber: number | null) => {
  const repo = repoShortName(repository);
  return prNumber != null ? `${repo} · PR #${prNumber}` : repo;
};

const parseWebhookLog = (log: {
  id: string;
  event_type: string;
  action: string | null;
  repository: string | null;
  payload?: unknown;
  created_at?: string;
}): ActivityFeedItem | null => {
  if (!log.created_at) return null;

  const prNumber = extractPrNumber(log.payload);
  const subtitle = buildSubtitle(log.repository, prNumber);
  const eventType = log.event_type;
  const action = log.action || "";

  let icon = "📡";
  let title = "GitHub activity";
  let dotColor: ActivityDotColor = "muted";
  let groupLabel = "events";

  if (eventType === "kodeye_ai_review") {
    const payload = log.payload as Record<string, unknown> | undefined;
    const count = payload?.comments_posted ?? payload?.issues_found;
    icon = "🤖";
    title =
      action === "comments_posted"
        ? "Kodeye AI posted review comments"
        : action === "completed"
          ? "Kodeye AI review completed"
          : "Kodeye AI review activity";
    if (typeof count === "number" && count > 0) {
      title =
        action === "comments_posted"
          ? `Kodeye AI posted ${count} review comment${count !== 1 ? "s" : ""}`
          : title;
    }
    dotColor = "green";
    groupLabel = "Kodeye AI reviews";
  } else if (eventType === "pull_request_review_comment" && action === "created") {
    icon = "💬";
    title = "Review comment posted";
    dotColor = "amber";
    groupLabel = "review comments";
  } else if (eventType === "pull_request" && action === "opened") {
    icon = "🔀";
    title = "New PR opened";
    dotColor = "green";
    groupLabel = "pull requests opened";
  } else if (eventType === "pull_request" && (action === "closed" || action === "merged")) {
    icon = "✅";
    const payload = log.payload as Record<string, unknown> | undefined;
    const pr = payload?.pull_request as Record<string, unknown> | undefined;
    const merged = action === "merged" || pr?.merged === true;
    title = merged ? "PR merged/closed" : "PR closed";
    dotColor = merged ? "green" : "amber";
    groupLabel = merged ? "pull requests merged" : "pull requests closed";
  } else if (eventType === "pull_request" && action === "synchronize") {
    icon = "🔄";
    title = "PR updated with new commits";
    dotColor = "amber";
    groupLabel = "pull request updates";
  } else if (eventType === "pull_request" && action === "reopened") {
    icon = "🔀";
    title = "PR reopened";
    dotColor = "green";
    groupLabel = "pull requests reopened";
  } else if (eventType === "pull_request") {
    icon = "🔀";
    title = `Pull request ${action || "updated"}`;
    dotColor = "amber";
    groupLabel = "pull request activity";
  } else if (eventType === "installation" && action === "created") {
    icon = "⚙️";
    title = "GitHub App installed";
    dotColor = "green";
    groupLabel = "installations";
  } else if (eventType === "installation_repositories") {
    icon = "📦";
    title = "Repositories updated";
    dotColor = "green";
    groupLabel = "repository changes";
  } else if (eventType === "push") {
    icon = "⬆️";
    title = "New push to branch";
    dotColor = "amber";
    groupLabel = "pushes";
  } else if (eventType === "issue_comment" || eventType === "pull_request_review") {
    icon = "💬";
    title = "Review activity on PR";
    dotColor = "amber";
    groupLabel = "review activity";
  } else {
    const label = eventType.replace(/_/g, " ");
    title =
      action && action !== "null"
        ? `${label} — ${action}`
        : label.charAt(0).toUpperCase() + label.slice(1);
    groupLabel = label;
  }

  return {
    id: `webhook-${log.id}`,
    source: "webhook",
    icon,
    title,
    subtitle,
    dot_color: dotColor,
    group_key: `${eventType}|${action}|${subtitle}`,
    group_label: groupLabel,
    created_at: log.created_at,
  };
};

const REAL_REVIEW_EVENT_TYPES = new Set([
  "ai_review_started",
  "review_completed",
  "github_comment_posted",
]);

/** Supabase may return nested FK rows as objects or single-element arrays. */
const firstRelation = <T>(value: T | T[] | null | undefined): T | null => {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
};

const normalizeReviewEventRow = (row: {
  id: string;
  event_type: string;
  label: string;
  detail?: string | null;
  created_at?: string;
  pull_requests?: unknown;
}) => {
  const pr = firstRelation(
    row.pull_requests as
      | {
          pr_number: number;
          title?: string;
          repositories?: { repo_name?: string; full_name?: string } | null;
        }
      | {
          pr_number: number;
          title?: string;
          repositories?: { repo_name?: string; full_name?: string } | null;
        }[]
      | null
  );
  const repo = pr ? firstRelation(pr.repositories) : null;

  return {
    id: row.id,
    event_type: row.event_type,
    label: row.label,
    detail: row.detail,
    created_at: row.created_at,
    pull_requests: pr
      ? { pr_number: pr.pr_number, title: pr.title, repositories: repo }
      : null,
  };
};

const parseReviewEvent = (row: {
  id: string;
  event_type: string;
  label: string;
  detail?: string | null;
  created_at?: string;
  pull_requests?: {
    pr_number: number;
    title?: string;
    repositories?: { repo_name?: string; full_name?: string } | null;
  } | null;
}): ActivityFeedItem | null => {
  if (!row.created_at || !REAL_REVIEW_EVENT_TYPES.has(row.event_type)) {
    return null;
  }

  const pr = row.pull_requests;
  const repo = pr?.repositories;
  const repoName = repo?.repo_name || repoShortName(repo?.full_name || null);
  const prNumber = pr?.pr_number;
  const subtitle =
    prNumber != null ? `${repoName} · PR #${prNumber}` : repoName || "Pull request";

  let icon = "🤖";
  let dotColor: ActivityDotColor = "green";

  if (row.event_type === "ai_review_started") {
    icon = "🤖";
    dotColor = "amber";
  } else if (row.event_type === "review_completed") {
    icon = "✨";
    dotColor = "green";
  } else if (row.event_type === "github_comment_posted") {
    icon = "💬";
    dotColor = "green";
  }

  const title = row.label;
  const detailSuffix = row.detail ? ` — ${row.detail}` : "";

  return {
    id: `review-${row.id}`,
    source: "review",
    icon,
    title: `${title}${detailSuffix}`,
    subtitle,
    dot_color: dotColor,
    group_key: `${row.event_type}|${subtitle}`,
    group_label: row.event_type.replace(/_/g, " "),
    created_at: row.created_at,
  };
};

export const buildActivityGroupHeader = (items: ActivityFeedItem[]): string | null => {
  if (items.length < 2) return null;
  const firstKey = items[0].group_key;
  if (!items.every((i) => i.group_key === firstKey)) return null;

  const latest = new Date(items[0].created_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${items.length} ${items[0].group_label} on ${items[0].subtitle} at ${latest}`;
};

export const getActivityFeed = async (userId: string, limit = 30) => {
  const supabase = getServiceDB();

  const [webhookLogs, reviewResult] = await Promise.all([
    listWebhookLogs(userId, Math.min(limit * 2, 50)),
    supabase
      .from("review_events")
      .select(
        `
        id,
        event_type,
        label,
        detail,
        status,
        created_at,
        pull_requests (
          pr_number,
          title,
          repositories (
            repo_name,
            full_name
          )
        )
      `
      )
      .eq("user_id", userId)
      .in("event_type", Array.from(REAL_REVIEW_EVENT_TYPES))
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (reviewResult.error) {
    logger.warn("Activity feed: review_events query failed", {
      error: reviewResult.error.message,
    });
  }

  const webhookItems = webhookLogs
    .map(parseWebhookLog)
    .filter((i): i is ActivityFeedItem => i !== null);

  const reviewItems = (reviewResult.data || [])
    .map((row) => parseReviewEvent(normalizeReviewEventRow(row)))
    .filter((i): i is ActivityFeedItem => i !== null);

  const merged = [...webhookItems, ...reviewItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const seen = new Set<string>();
  const deduped: ActivityFeedItem[] = [];

  for (const item of merged) {
    const minuteKey = `${item.group_key}|${item.created_at.slice(0, 16)}`;
    if (seen.has(minuteKey)) continue;
    seen.add(minuteKey);
    deduped.push(item);
    if (deduped.length >= limit) break;
  }

  const groupHeader = buildActivityGroupHeader(deduped);

  return {
    items: deduped,
    group_header: groupHeader,
    sources: {
      webhooks: webhookItems.length,
      reviews: reviewItems.length,
    },
  };
};
