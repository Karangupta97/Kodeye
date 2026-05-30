import { AIReviewIssue } from "../parser/schema.validator";

export interface RiskScores {
  overallRisk: number;
  securityRisk: number;
  performanceRisk: number;
  maintainability: number;
}

export type RiskLabel = "low" | "medium" | "high" | "critical";

const SEVERITY_WEIGHTS = {
  critical: 40,
  warning: 20,
  suggestion: 5,
  info: 2,
} as const;

const SENSITIVE_FILE_PATTERNS = [
  /\.env/i,
  /secret/i,
  /password/i,
  /credential/i,
  /\.pem$/i,
  /\.key$/i,
  /private/i,
];

const AUTH_FILE_PATTERNS = [
  /auth/i,
  /login/i,
  /session/i,
  /token/i,
  /middleware/i,
  /guard/i,
  /permission/i,
  /rbac/i,
];

const CONFIG_FILE_PATTERNS = [
  /config/i,
  /\.yml$/i,
  /\.yaml$/i,
  /docker/i,
  /nginx/i,
  /\.conf$/i,
  /production/i,
];

const DEPENDENCY_FILES = [
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "requirements.txt",
  "go.mod",
  "Gemfile",
  "Cargo.toml",
];

const cap = (value: number): number => Math.min(100, Math.max(0, value));

const matchesAny = (filename: string, patterns: RegExp[]): boolean =>
  patterns.some((p) => p.test(filename));

export const calculateRiskScores = (
  issues: AIReviewIssue[],
  changedFiles: string[],
  totalAdditions: number,
  totalDeletions: number
): RiskScores => {
  // ── Base scores from issues ──────────────────────────
  let securityBase = 0;
  let performanceBase = 0;
  let maintainabilityBase = 0;
  let overallBase = 0;

  for (const issue of issues) {
    const weight = SEVERITY_WEIGHTS[issue.severity] || 5;
    const confidenceMultiplier = issue.confidence;
    const score = weight * confidenceMultiplier;

    overallBase += score;

    switch (issue.category) {
      case "security":
        securityBase += score;
        break;
      case "performance":
        performanceBase += score;
        break;
      case "bug":
        overallBase += score * 0.5; // Bugs weigh extra on overall
        break;
      case "style":
        maintainabilityBase += score;
        break;
    }
  }

  // ── File-based modifiers ─────────────────────────────
  let fileModifier = 0;

  for (const file of changedFiles) {
    if (matchesAny(file, SENSITIVE_FILE_PATTERNS)) {
      securityBase += 20;
      fileModifier += 15;
    }

    if (matchesAny(file, AUTH_FILE_PATTERNS)) {
      securityBase += 15;
      fileModifier += 10;
    }

    if (matchesAny(file, CONFIG_FILE_PATTERNS)) {
      fileModifier += 10;
    }

    const basename = file.split("/").pop() || "";
    if (DEPENDENCY_FILES.includes(basename)) {
      securityBase += 10;
      fileModifier += 10;
    }
  }

  // ── Size-based modifiers ─────────────────────────────
  const totalChanges = totalAdditions + totalDeletions;
  if (totalChanges > 1000) {
    fileModifier += 15;
    maintainabilityBase += 15;
  } else if (totalChanges > 500) {
    fileModifier += 10;
    maintainabilityBase += 10;
  } else if (totalChanges > 200) {
    fileModifier += 5;
  }

  // If many files changed, bump maintainability risk
  if (changedFiles.length > 20) {
    maintainabilityBase += 15;
  } else if (changedFiles.length > 10) {
    maintainabilityBase += 8;
  }

  return {
    overallRisk: cap(overallBase + fileModifier),
    securityRisk: cap(securityBase),
    performanceRisk: cap(performanceBase),
    maintainability: cap(maintainabilityBase),
  };
};

export const getRiskLabel = (score: number): RiskLabel => {
  if (score >= 81) return "critical";
  if (score >= 61) return "high";
  if (score >= 31) return "medium";
  return "low";
};

export const getRiskColor = (label: RiskLabel): string => {
  switch (label) {
    case "critical":
      return "#EF4444";
    case "high":
      return "#F97316";
    case "medium":
      return "#F59E0B";
    case "low":
      return "#22C55E";
  }
};
