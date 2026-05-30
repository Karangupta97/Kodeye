import { logger } from "../../utils/logger";

export interface PRFileInfo {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
}

export interface PRMetadata {
  title: string;
  description?: string;
  author: string;
  branch: string;
  prNumber: number;
  repositoryFullName: string;
}

export interface PRContext {
  metadata: PRMetadata;
  diffSummary: string;
  fileContexts: string;
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
  fileList: string[];
}

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".bmp",
  ".mp3", ".mp4", ".avi", ".mov", ".webm",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".rar", ".7z",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".exe", ".dll", ".so", ".dylib",
  ".lock", ".min.js", ".min.css",
]);

const MAX_PATCH_CHARS = 30_000;
const MAX_TOTAL_CONTEXT_CHARS = 120_000;

const isBinaryFile = (filename: string): boolean => {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
};

const truncatePatch = (patch: string, maxChars: number): string => {
  if (patch.length <= maxChars) {
    return patch;
  }

  const truncated = patch.substring(0, maxChars);
  const lastNewline = truncated.lastIndexOf("\n");
  return (
    (lastNewline > 0 ? truncated.substring(0, lastNewline) : truncated) +
    "\n... [TRUNCATED — patch too large]"
  );
};

export const buildFileContext = (file: PRFileInfo): string | null => {
  if (isBinaryFile(file.filename)) {
    return null;
  }

  if (!file.patch) {
    return null;
  }

  const patch = truncatePatch(file.patch, MAX_PATCH_CHARS);

  return [
    `### File: ${file.filename}`,
    `Status: ${file.status} | +${file.additions} -${file.deletions}`,
    "```diff",
    patch,
    "```",
  ].join("\n");
};

export const buildDiffSummary = (files: PRFileInfo[]): string => {
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  const fileTypes = new Map<string, number>();
  for (const file of files) {
    const ext =
      file.filename.substring(file.filename.lastIndexOf(".")) || "other";
    fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
  }

  const typeBreakdown = Array.from(fileTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([ext, count]) => `  ${ext}: ${count} file(s)`)
    .join("\n");

  return [
    `Files changed: ${files.length}`,
    `Total additions: +${totalAdditions}`,
    `Total deletions: -${totalDeletions}`,
    `File types:\n${typeBreakdown}`,
  ].join("\n");
};

export const buildPRContext = (
  metadata: PRMetadata,
  files: PRFileInfo[]
): PRContext => {
  const codeFiles = files.filter((f) => !isBinaryFile(f.filename));
  const skippedCount = files.length - codeFiles.length;

  if (skippedCount > 0) {
    logger.debug("Skipped binary files in AI context", {
      skipped: skippedCount,
    });
  }

  const fileContextParts: string[] = [];
  let totalChars = 0;

  for (const file of codeFiles) {
    const ctx = buildFileContext(file);
    if (!ctx) {
      continue;
    }

    if (totalChars + ctx.length > MAX_TOTAL_CONTEXT_CHARS) {
      fileContextParts.push(
        `\n... [REMAINING ${codeFiles.length - fileContextParts.length} FILES OMITTED — context limit reached]`
      );
      break;
    }

    fileContextParts.push(ctx);
    totalChars += ctx.length;
  }

  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return {
    metadata,
    diffSummary: buildDiffSummary(files),
    fileContexts: fileContextParts.join("\n\n"),
    totalAdditions,
    totalDeletions,
    totalFiles: files.length,
    fileList: files.map((f) => f.filename),
  };
};

export const formatContextForAI = (context: PRContext): string => {
  return [
    "=== PULL REQUEST METADATA ===",
    `Title: ${context.metadata.title}`,
    `Author: ${context.metadata.author}`,
    `Branch: ${context.metadata.branch}`,
    `Repository: ${context.metadata.repositoryFullName}`,
    context.metadata.description
      ? `Description: ${context.metadata.description}`
      : "",
    "",
    "=== DIFF SUMMARY ===",
    context.diffSummary,
    "",
    "=== FILE DIFFS ===",
    context.fileContexts,
  ]
    .filter(Boolean)
    .join("\n");
};
