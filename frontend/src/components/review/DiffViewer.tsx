"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import SeverityBadge from "./SeverityBadge";

interface DiffLine {
  type: "add" | "del" | "context" | "hunk" | "empty";
  content: string;
  oldLine: number | null;
  newLine: number | null;
}

interface AIComment {
  line: number;
  severity: string;
  issue: string;
  why?: string;
  fix?: string;
  confidence?: number;
  category?: string;
}

interface DiffViewerProps {
  id?: string;
  filename: string;
  patch: string;
  comments?: AIComment[];
  riskScore?: number;
  defaultCollapsed?: boolean;
}

const LANG_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  py: "python",
  go: "go",
  java: "java",
  cs: "csharp",
  rs: "rust",
};

const detectLanguage = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return LANG_MAP[ext] || "typescript";
};

const parsePatchLines = (patch: string): DiffLine[] => {
  const rawLines = patch.split("\n");
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const raw of rawLines) {
    if (raw.startsWith("@@")) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/.exec(raw);
      if (match) {
        oldLine = Number(match[1]);
        newLine = Number(match[2]);
      }
      result.push({ type: "hunk", content: raw, oldLine: null, newLine: null });
      continue;
    }
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      result.push({ type: "add", content: raw.slice(1), oldLine: null, newLine });
      newLine++;
      continue;
    }
    if (raw.startsWith("-") && !raw.startsWith("---")) {
      result.push({ type: "del", content: raw.slice(1), oldLine, newLine: null });
      oldLine++;
      continue;
    }
    if (raw.startsWith(" ")) {
      result.push({ type: "context", content: raw.slice(1), oldLine, newLine });
      oldLine++;
      newLine++;
    }
  }
  return result;
};

const severityColors: Record<string, string> = {
  critical: "var(--kd-critical)",
  high: "#F97316",
  warning: "#F97316",
  medium: "var(--kd-warning)",
  suggestion: "var(--kd-warning)",
  low: "var(--kd-success)",
  info: "var(--kd-info)",
};

const MAX_VISIBLE = 400;

export default function DiffViewer({
  id,
  filename,
  patch,
  comments = [],
  riskScore,
  defaultCollapsed = false,
}: DiffViewerProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [search, setSearch] = useState("");
  const [expandedContext, setExpandedContext] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => parsePatchLines(patch), [patch]);
  const language = detectLanguage(filename);

  const commentMap = useMemo(() => {
    const map = new Map<number, AIComment>();
    for (const c of comments) {
      if (!map.has(c.line)) map.set(c.line, c);
    }
    return map;
  }, [comments]);

  const filteredLines = useMemo(() => {
    if (!search.trim()) return lines;
    const q = search.toLowerCase();
    return lines.filter((l) => l.content.toLowerCase().includes(q));
  }, [lines, search]);

  const displayLines = expandedContext
    ? filteredLines
    : filteredLines.slice(0, MAX_VISIBLE);

  const truncated = !expandedContext && filteredLines.length > MAX_VISIBLE;

  useEffect(() => {
    if (id && ref.current && window.location.hash === `#file-${id}`) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [id]);

  const riskLevel =
    riskScore !== undefined
      ? riskScore >= 75
        ? "Critical"
        : riskScore >= 50
          ? "High"
          : riskScore >= 25
            ? "Medium"
            : "Low"
      : null;

  return (
    <div
      ref={ref}
      id={id ? `file-${id}` : undefined}
      className="diff-viewer rounded-xl border border-kd-border overflow-hidden"
    >
      <div className="diff-viewer-header flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-kd-border">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-kd-text-muted hover:text-kd-text"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        <span className="text-sm font-mono text-kd-text truncate flex-1 min-w-0">
          {filename}
        </span>
        <span className="text-[10px] text-kd-text-muted uppercase">{language}</span>
        {riskLevel && riskScore !== undefined && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-kd-critical/30 text-kd-critical bg-kd-critical/10">
            {riskLevel} · {riskScore}
          </span>
        )}
        {comments.length > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-kd-warning/15 text-kd-warning border border-kd-warning/20">
            {comments.length} finding{comments.length !== 1 ? "s" : ""}
          </span>
        )}
        {!collapsed && (
          <div className="relative w-full sm:w-auto sm:ml-auto mt-1 sm:mt-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-kd-text-muted" />
            <input
              type="search"
              placeholder="Search in file..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-44 pl-7 pr-2 py-1 text-xs rounded-lg border border-kd-border bg-kd-bg/60 text-kd-text"
            />
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="diff-viewer-body overflow-x-auto max-h-[32rem] overflow-y-auto">
          <table className="w-full text-xs font-mono leading-relaxed">
            <tbody>
              {displayLines.map((line, idx) => {
                const comment = line.newLine ? commentMap.get(line.newLine) : null;
                const lineColor =
                  severityColors[comment?.severity || ""] || undefined;

                return (
                  <tr key={idx} className={`diff-line diff-line-${line.type}`}>
                    <td className="diff-line-num select-none text-right px-2 w-10">
                      {line.type === "hunk" ? "" : (line.oldLine ?? "")}
                    </td>
                    <td className="diff-line-num select-none text-right px-2 w-10">
                      {line.type === "hunk" ? "" : (line.newLine ?? "")}
                    </td>
                    <td className="diff-line-indicator select-none w-5 text-center">
                      {line.type === "add" && "+"}
                      {line.type === "del" && "−"}
                    </td>
                    <td
                      className="diff-line-content px-0 whitespace-pre"
                      style={
                        comment
                          ? {
                              borderLeft: `3px solid ${lineColor}`,
                              background: `color-mix(in srgb, ${lineColor} 8%, transparent)`,
                            }
                          : undefined
                      }
                    >
                      {line.type === "hunk" ? (
                        <span className="px-3 text-kd-info italic">{line.content}</span>
                      ) : (
                        <SyntaxHighlighter
                          language={language}
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: "2px 12px",
                            background: "transparent",
                            fontSize: "0.75rem",
                          }}
                          PreTag="span"
                          CodeTag="span"
                        >
                          {line.content || " "}
                        </SyntaxHighlighter>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {truncated && (
            <button
              type="button"
              onClick={() => setExpandedContext(true)}
              className="w-full py-2 text-xs text-kd-glow hover:bg-kd-primary/10 border-t border-kd-border"
            >
              Show all {filteredLines.length} lines
            </button>
          )}
          {comments.map((c) => (
            <div
              key={`c-${c.line}`}
              className="mx-4 my-2 p-3 rounded-lg border border-kd-border/60 bg-kd-card/80"
            >
              <div className="flex items-center gap-2 mb-1">
                <SeverityBadge severity={c.severity} />
                <span className="text-xs font-semibold text-kd-text">L{c.line}</span>
              </div>
              <p className="text-xs text-kd-text font-medium">{c.issue}</p>
              {c.why && (
                <p className="text-[11px] text-kd-text-muted mt-1">{c.why}</p>
              )}
              {c.fix && (
                <pre className="text-[11px] mt-2 p-2 rounded bg-kd-bg/60 overflow-x-auto">
                  {c.fix}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
