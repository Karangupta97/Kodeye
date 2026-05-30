import { fetchApi } from "./api";

export type ActivityDotColor = "green" | "amber" | "red" | "muted";

export interface ActivityFeedItem {
  id: string;
  source: "webhook" | "review";
  icon: string;
  title: string;
  subtitle: string;
  dotColor: ActivityDotColor;
  groupKey: string;
  groupLabel: string;
  createdAt: string;
  relativeTime: string;
}

export interface ActivityFeedResponse {
  items: Array<{
    id: string;
    source: "webhook" | "review";
    icon: string;
    title: string;
    subtitle: string;
    dot_color: ActivityDotColor;
    group_key: string;
    group_label: string;
    created_at: string;
  }>;
  group_header: string | null;
  sources?: { webhooks: number; reviews: number };
}

export const formatRelativeTime = (value?: string | null): string => {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
};

const mapItem = (row: ActivityFeedResponse["items"][0]): ActivityFeedItem => ({
  id: row.id,
  source: row.source,
  icon: row.icon,
  title: row.title,
  subtitle: row.subtitle,
  dotColor: row.dot_color,
  groupKey: row.group_key,
  groupLabel: row.group_label,
  createdAt: row.created_at,
  relativeTime: formatRelativeTime(row.created_at),
});

export const fetchActivityFeed = async (limit = 30) => {
  const data = await fetchApi<ActivityFeedResponse>(
    `/api/activity-feed?limit=${limit}`
  );

  return {
    items: data.items.map(mapItem),
    groupHeader: data.group_header,
    sources: data.sources,
  };
};
