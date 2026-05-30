import type { PRFileInfo } from "../context/context.builder";
import type { AIReviewIssue } from "../parser/schema.validator";
import { parsePatch } from "../../utils/diff";

const JSON_FILE_PATTERN = /\.json$/i;
const ENV_FILE_PATTERN = /(?:^|\/)\.env(?:\.|$)|\.env\.(?:local|example)$/i;

const reconstructNewFileContent = (patch: string): string => {
  const { lines } = parsePatch(patch);
  return lines
    .filter((l) => l.newLine != null && (l.type === "add" || l.type === "context"))
    .map((l) => l.content)
    .join("\n");
};

const firstMeaningfulLine = (patch: string): number => {
  const { addedLines } = parsePatch(patch);
  if (addedLines.length > 0 && addedLines[0].newLine != null) {
    return addedLines[0].newLine;
  }
  const { lines } = parsePatch(patch);
  const first = lines.find((l) => l.newLine != null);
  return first?.newLine ?? 1;
};

const jsonSyntaxIssue = (
  file: PRFileInfo,
  message: string,
  line: number
): AIReviewIssue => ({
  severity: "critical",
  category: "bug",
  file: file.filename,
  line,
  issue: "Invalid JSON syntax in diff",
  why: message,
  fix: "Fix the JSON syntax error before merging. Validate with `jq` or a JSON linter.",
  confidence: 0.95,
});

const analyzeJsonFile = (file: PRFileInfo): AIReviewIssue[] => {
  if (!file.patch) return [];

  const issues: AIReviewIssue[] = [];
  const line = firstMeaningfulLine(file.patch);
  const content = reconstructNewFileContent(file.patch).trim();

  if (!content) return issues;

  const { addedLines } = parsePatch(file.patch);
  for (const added of addedLines) {
    const trimmed = added.content.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;
    if (/,\s*[\}\]]/.test(trimmed)) {
      issues.push({
        severity: "warning",
        category: "bug",
        file: file.filename,
        line: added.newLine ?? line,
        issue: "Possible trailing comma in JSON",
        why: "JSON does not allow trailing commas before `}` or `]`. This line may break parsers.",
        fix: "Remove the trailing comma from the last property or array element.",
        confidence: 0.85,
      });
      break;
    }
  }

  try {
    JSON.parse(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid JSON";
    const positionMatch = /position\s+(\d+)/i.exec(msg);
    let errorLine = line;
    if (positionMatch) {
      const pos = Number(positionMatch[1]);
      const before = content.slice(0, pos);
      errorLine = line + (before.match(/\n/g)?.length ?? 0);
    }
    issues.push(jsonSyntaxIssue(file, msg, Math.max(1, errorLine)));
  }

  return issues;
};

const analyzeEnvFile = (file: PRFileInfo): AIReviewIssue[] => {
  if (!file.patch) return [];

  const issues: AIReviewIssue[] = [];
  const { addedLines } = parsePatch(file.patch);

  for (const added of addedLines) {
    const trimmed = added.content.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (/^[A-Z_][A-Z0-9_]*=\s*$/.test(trimmed)) {
      issues.push({
        severity: "warning",
        category: "bug",
        file: file.filename,
        line: added.newLine ?? 1,
        issue: "Environment variable with empty value",
        why: "This key is set but has no value, which may cause runtime misconfiguration.",
        fix: "Provide a value, remove the line, or document it in `.env.example` only.",
        confidence: 0.8,
      });
    }

    if (/^(?:password|secret|api[_-]?key|token)\s*=/i.test(trimmed)) {
      issues.push({
        severity: "critical",
        category: "security",
        file: file.filename,
        line: added.newLine ?? 1,
        issue: "Possible secret committed in env file",
        why: "Sensitive-looking keys in env files are easy to leak via version control.",
        fix: "Use a secrets manager or CI-injected env vars instead of committing credentials.",
        confidence: 0.75,
      });
    }
  }

  return issues;
};

/**
 * Deterministic checks on PR diffs (JSON syntax, env misconfig, etc.)
 * without calling the LLM.
 */
export const analyzeDiffForStaticIssues = (
  files: PRFileInfo[]
): AIReviewIssue[] => {
  const issues: AIReviewIssue[] = [];

  for (const file of files) {
    if (!file.patch) continue;

    if (JSON_FILE_PATTERN.test(file.filename)) {
      issues.push(...analyzeJsonFile(file));
    } else if (ENV_FILE_PATTERN.test(file.filename)) {
      issues.push(...analyzeEnvFile(file));
    }
  }

  return issues;
};
