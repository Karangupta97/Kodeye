import type { ReviewBundle, ReviewFile, ReviewFinding } from "./review-api";

export function getFileLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TSX",
    js: "JavaScript",
    jsx: "JSX",
    json: "JSON",
    md: "Markdown",
    py: "Python",
    go: "Go",
    rs: "Rust",
    java: "Java",
    css: "CSS",
    scss: "SCSS",
    sql: "SQL",
    yml: "YAML",
    yaml: "YAML",
  };
  return map[ext] || ext.toUpperCase() || "Text";
}

export function mergeReviewFiles(
  files: ReviewFile[],
  findings: ReviewFinding[]
): ReviewFile[] {
  const byName = new Map<string, ReviewFile>();
  for (const f of files) {
    byName.set(f.filename, f);
  }
  for (const finding of findings) {
    if (!finding.file || byName.has(finding.file)) continue;
    byName.set(finding.file, {
      id: `merged-${byName.size + 1}`,
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
  return Array.from(byName.values()).sort((a, b) =>
    a.filename.localeCompare(b.filename)
  );
}

export function countFindingsByFile(findings: ReviewFinding[]) {
  const map = new Map<
    string,
    { critical: number; high: number; medium: number; low: number; total: number }
  >();
  for (const f of findings) {
    const entry = map.get(f.file) || {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0,
    };
    entry.total++;
    const s = f.severity as keyof typeof entry;
    if (s in entry && s !== "total") {
      entry[s]++;
    }
    map.set(f.file, entry);
  }
  return map;
}

export function formatDurationMs(ms?: number): string | null {
  if (ms == null || ms <= 0) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatReviewDuration(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

export type SeverityKey = "critical" | "high" | "medium" | "low";

export function severityAnalytics(bundle: ReviewBundle) {
  const counts = bundle.severity_counts;
  const total =
    counts.critical + counts.high + counts.medium + counts.low || 0;

  const rows: Array<{
    key: SeverityKey;
    label: string;
    count: number;
    percent: number;
  }> = [
    { key: "critical", label: "Critical", count: counts.critical, percent: 0 },
    { key: "high", label: "High", count: counts.high, percent: 0 },
    { key: "medium", label: "Medium", count: counts.medium, percent: 0 },
    { key: "low", label: "Low", count: counts.low, percent: 0 },
  ];

  for (const row of rows) {
    row.percent = total > 0 ? Math.round((row.count / total) * 100) : 0;
  }

  const dominant = rows.reduce((best, row) =>
    row.count > best.count ? row : best
  );

  const topCategory = [...bundle.category_counts].sort(
    (a, b) => b.count - a.count
  )[0];

  return { rows, total, dominant, topCategory };
}
