import { parsePatch, DiffLine } from "../../utils/diff";
import { PRFileInfo } from "../context/context.builder";
import { FixGenerationContext } from "./fix.schema";

const LANG_MAP: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript/React",
  js: "JavaScript",
  jsx: "JavaScript/React",
  py: "Python",
  go: "Go",
  java: "Java",
  cs: "C#",
  rs: "Rust",
  rb: "Ruby",
  php: "PHP",
};

const FRAMEWORK_HINTS: Record<string, string> = {
  "package.json": "Node.js",
  "next.config": "Next.js",
  "app/": "Next.js App Router",
  "pages/": "Next.js Pages Router",
  "express": "Express.js",
  "django": "Django",
  "flask": "Flask",
  "spring": "Spring",
};

export const detectLanguage = (filePath: string): string => {
  const ext = filePath.includes(".")
    ? filePath.slice(filePath.lastIndexOf(".") + 1).toLowerCase()
    : "";
  return LANG_MAP[ext] || "TypeScript";
};

export const detectFrameworkHints = (
  filePath: string,
  repoFullName: string
): string => {
  const hints = new Set<string>();
  const lower = filePath.toLowerCase();
  for (const [key, value] of Object.entries(FRAMEWORK_HINTS)) {
    if (lower.includes(key)) hints.add(value);
  }
  if (repoFullName.toLowerCase().includes("next")) hints.add("Next.js");
  return hints.size ? Array.from(hints).join(", ") : "General";
};

export const extractCodeContext = (
  patch: string | null,
  targetLine: number,
  radius = 8
): { originalCode: string; surroundingContext: string; startLine: number; endLine: number } => {
  if (!patch) {
    return {
      originalCode: "",
      surroundingContext: "",
      startLine: targetLine,
      endLine: targetLine,
    };
  }

  const { lines } = parsePatch(patch);
  const byNewLine = lines.filter((l) => l.newLine !== null);

  let targetIdx = byNewLine.findIndex((l) => l.newLine === targetLine);
  if (targetIdx === -1) {
    targetIdx = byNewLine.findIndex(
      (l) =>
        l.newLine !== null &&
        Math.abs((l.newLine as number) - targetLine) <= 3 &&
        (l.type === "add" || l.type === "context")
    );
  }

  if (targetIdx === -1 && byNewLine.length > 0) {
    targetIdx = 0;
  }

  const start = Math.max(0, targetIdx - radius);
  const end = Math.min(byNewLine.length - 1, targetIdx + radius);

  const slice = byNewLine.slice(start, end + 1);
  const formatLine = (l: DiffLine) => {
    const prefix = l.type === "add" ? "+" : l.type === "del" ? "-" : " ";
    const num = l.newLine ?? l.oldLine ?? "";
    return `${num} ${prefix} ${l.content}`;
  };

  const surroundingContext = slice.map(formatLine).join("\n");

  const problemLines = slice.filter(
    (l) =>
      l.newLine !== null &&
      Math.abs((l.newLine as number) - (byNewLine[targetIdx]?.newLine ?? targetLine)) <= 2
  );

  const originalCode =
    problemLines.length > 0
      ? problemLines.map((l) => l.content).join("\n")
      : byNewLine[targetIdx]?.content ?? "";

  const startLine = problemLines[0]?.newLine ?? targetLine;
  const endLine = problemLines[problemLines.length - 1]?.newLine ?? targetLine;

  return { originalCode, surroundingContext, startLine, endLine };
};

export const buildFixContext = (input: {
  metadata: {
    title: string;
    description?: string;
    repositoryFullName: string;
  };
  file: PRFileInfo;
  finding: {
    category: string;
    severity: string;
    file: string;
    line: number;
    issue: string;
    why: string;
    fix: string;
  };
}): FixGenerationContext & { startLine: number; endLine: number } => {
  const { file, finding, metadata } = input;
  const { originalCode, surroundingContext, startLine, endLine } =
    extractCodeContext(file.patch, finding.line);

  return {
    prTitle: metadata.title,
    prDescription: metadata.description,
    repositoryFullName: metadata.repositoryFullName,
    filePath: finding.file,
    language: detectLanguage(finding.file),
    frameworkHints: detectFrameworkHints(
      finding.file,
      metadata.repositoryFullName
    ),
    issueType: finding.category,
    issueDescription: finding.issue,
    issueWhy: finding.why,
    severity: finding.severity,
    line: finding.line,
    originalCode: originalCode || finding.fix,
    surroundingContext:
      surroundingContext || file.patch?.substring(0, 2000) || "",
    existingFixHint: finding.fix,
    startLine,
    endLine,
  };
};
