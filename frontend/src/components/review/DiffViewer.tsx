"use client";

import { useMemo } from "react";

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
}

interface DiffViewerProps {
  filename: string;
  patch: string;
  comments?: AIComment[];
}

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
      continue;
    }

    if (raw.startsWith("\\")) {
      result.push({ type: "empty", content: raw, oldLine: null, newLine: null });
    }
  }

  return result;
};

const severityColors: Record<string, string> = {
  critical: "var(--kd-critical)",
  warning: "var(--kd-warning)",
  suggestion: "var(--kd-accent)",
  info: "#3B82F6",
};

export default function DiffViewer({ filename, patch, comments = [] }: DiffViewerProps) {
  const lines = useMemo(() => parsePatchLines(patch), [patch]);

  const commentMap = useMemo(() => {
    const map = new Map<number, AIComment>();
    for (const c of comments) {
      if (!map.has(c.line)) {
        map.set(c.line, c);
      }
    }
    return map;
  }, [comments]);

  return (
    <div className="diff-viewer rounded-xl border border-kd-border overflow-hidden">
      {/* File header */}
      <div className="diff-viewer-header flex items-center gap-2 px-4 py-2.5 border-b border-kd-border">
        <svg className="w-4 h-4 text-kd-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm font-mono text-kd-text truncate">{filename}</span>
        {comments.length > 0 && (
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-kd-warning/15 text-kd-warning border border-kd-warning/20">
            {comments.length} finding{comments.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Diff content */}
      <div className="diff-viewer-body overflow-x-auto">
        <table className="w-full text-xs font-mono leading-relaxed">
          <tbody>
            {lines.map((line, idx) => {
              const comment = line.newLine ? commentMap.get(line.newLine) : null;
              const lineColor = severityColors[comment?.severity || ""] || undefined;

              return (
                <tr key={idx} className={`diff-line diff-line-${line.type}`}>
                  {/* Old line number */}
                  <td className="diff-line-num select-none text-right px-2 w-12">
                    {line.type === "hunk" ? "" : (line.oldLine ?? "")}
                  </td>
                  {/* New line number */}
                  <td className="diff-line-num select-none text-right px-2 w-12">
                    {line.type === "hunk" ? "" : (line.newLine ?? "")}
                  </td>
                  {/* Indicator */}
                  <td className="diff-line-indicator select-none w-5 text-center">
                    {line.type === "add" && "+"}
                    {line.type === "del" && "−"}
                    {line.type === "hunk" && "@@"}
                  </td>
                  {/* Content */}
                  <td
                    className="diff-line-content px-3 whitespace-pre-wrap"
                    style={comment ? {
                      borderLeft: `3px solid ${lineColor}`,
                      background: `color-mix(in srgb, ${lineColor} 8%, transparent)`,
                    } : undefined}
                  >
                    {line.content}
                    {comment && (
                      <span
                        className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          color: lineColor,
                          background: `color-mix(in srgb, ${lineColor} 15%, transparent)`,
                        }}
                      >
                        ← {comment.issue}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
