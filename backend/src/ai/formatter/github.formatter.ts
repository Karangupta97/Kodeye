import { AIReviewIssue, Severity } from "../parser/schema.validator";

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  warning: "🟡",
  suggestion: "🟣",
  info: "🔵",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical",
  warning: "Warning",
  suggestion: "Suggestion",
  info: "Info",
};

const CATEGORY_EMOJI: Record<string, string> = {
  security: "🔒",
  bug: "🐛",
  performance: "⚡",
  style: "🎨",
};

const CATEGORY_LABEL: Record<string, string> = {
  security: "Security",
  bug: "Bug",
  performance: "Performance",
  style: "Code Quality",
};

/**
 * Formats a single AI review issue into a polished GitHub inline comment.
 */
export const formatIssueAsComment = (issue: AIReviewIssue): string => {
  const sevEmoji = SEVERITY_EMOJI[issue.severity] || "⚪";
  const sevLabel = SEVERITY_LABEL[issue.severity] || issue.severity;
  const catEmoji = CATEGORY_EMOJI[issue.category] || "📋";
  const catLabel = CATEGORY_LABEL[issue.category] || issue.category;
  const confidence = Math.round(issue.confidence * 100);

  const lines = [
    `${sevEmoji} **${sevLabel}** — ${catEmoji} ${catLabel}`,
    "",
    `**Issue:** ${issue.issue}`,
    "",
    `**Why this matters:**`,
    issue.why,
    "",
    `**Recommended fix:**`,
    issue.fix,
    "",
    `---`,
    `🎯 Confidence: ${confidence}% · 🤖 *Kodeye AI Review*`,
  ];

  return lines.join("\n");
};

/**
 * Formats a PR-level summary comment with all findings.
 */
export const formatSummaryComment = (
  issues: AIReviewIssue[],
  riskScore: number
): string => {
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const suggestionCount = issues.filter(
    (i) => i.severity === "suggestion"
  ).length;

  const securityCount = issues.filter((i) => i.category === "security").length;
  const bugCount = issues.filter((i) => i.category === "bug").length;
  const perfCount = issues.filter((i) => i.category === "performance").length;
  const styleCount = issues.filter((i) => i.category === "style").length;

  const riskEmoji =
    riskScore >= 81
      ? "🔴"
      : riskScore >= 61
        ? "🟠"
        : riskScore >= 31
          ? "🟡"
          : "🟢";

  const riskLabel =
    riskScore >= 81
      ? "Critical"
      : riskScore >= 61
        ? "High"
        : riskScore >= 31
          ? "Medium"
          : "Low";

  const lines = [
    `## 🤖 Kodeye AI Review Summary`,
    "",
    `${riskEmoji} **Risk Score: ${riskScore}/100** (${riskLabel})`,
    "",
    `### Findings`,
    "",
    `| Severity | Count |`,
    `|----------|-------|`,
    `| 🔴 Critical | ${criticalCount} |`,
    `| 🟡 Warning | ${warningCount} |`,
    `| 🟣 Suggestion | ${suggestionCount} |`,
    "",
    `### Categories`,
    "",
    `| Category | Count |`,
    `|----------|-------|`,
    `| 🔒 Security | ${securityCount} |`,
    `| 🐛 Bugs | ${bugCount} |`,
    `| ⚡ Performance | ${perfCount} |`,
    `| 🎨 Code Quality | ${styleCount} |`,
    "",
  ];

  if (issues.length === 0) {
    lines.push("✅ **No issues detected.** This PR looks clean!");
  } else {
    lines.push(
      `📝 **${issues.length} issue(s) detected.** See inline comments for details.`
    );
  }

  lines.push("", "---", "*Powered by Kodeye AI*");

  return lines.join("\n");
};
