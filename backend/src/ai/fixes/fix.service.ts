import { logger } from "../../utils/logger";
import { PRFileInfo } from "../context/context.builder";
import { buildFixContext } from "./fix.generator";
import { runFixAgent } from "./fix.agent";
import { confidenceLabel } from "./fix.validator";
import {
  getFixByFindingId,
  upsertReviewFix,
  deleteFixesByPR,
} from "../../services/reviewFixes.service";

export interface StoredFinding {
  id: string;
  pr_id: string;
  severity: string;
  category: string;
  file: string;
  line: number;
  issue: string;
  why: string;
  fix: string;
  confidence: number;
}

const CONCURRENCY = 3;

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
  }
}

export const generateFixForFinding = async (input: {
  finding: StoredFinding;
  userId: string;
  repositoryId: string;
  files: PRFileInfo[];
  metadata: {
    title: string;
    description?: string;
    repositoryFullName: string;
  };
  force?: boolean;
}) => {
  const { finding, userId, repositoryId, files, metadata, force } = input;

  if (!force) {
    const existing = await getFixByFindingId(finding.id, userId);
    if (existing) {
      return existing;
    }
  }

  const file =
    files.find((f) => f.filename === finding.file) ||
    ({ filename: finding.file, patch: null, status: "modified", additions: 0, deletions: 0, changes: 0 } as PRFileInfo);

  const ctx = buildFixContext({ metadata, file, finding });
  const aiFix = await runFixAgent(ctx);

  if (!aiFix) {
    logger.info("Fix generation skipped: no valid fix", {
      findingId: finding.id,
      file: finding.file,
    });
    return null;
  }

  const confidence0to1 = Math.min(1, Math.max(0, aiFix.confidence / 100));

  const record = await upsertReviewFix({
    finding_id: finding.id,
    repository_id: repositoryId,
    pr_id: finding.pr_id,
    user_id: userId,
    file_path: finding.file,
    start_line: ctx.startLine,
    end_line: ctx.endLine,
    issue_type: finding.category,
    severity: finding.severity,
    original_code: aiFix.originalCode,
    suggested_code: aiFix.suggestedCode,
    explanation: aiFix.explanation,
    why_fix_works: aiFix.whyFixWorks,
    confidence: confidence0to1,
    status: "suggested",
  });

  logger.info("Fix generated", {
    findingId: finding.id,
    confidence: confidence0to1,
    label: confidenceLabel(confidence0to1),
  });

  return record;
};

export const generateFixesForPR = async (input: {
  prId: string;
  userId: string;
  repositoryId: string;
  findings: StoredFinding[];
  files: PRFileInfo[];
  metadata: {
    title: string;
    description?: string;
    repositoryFullName: string;
  };
}) => {
  const { prId, userId, repositoryId, findings, files, metadata } = input;

  if (!findings.length) {
    return { generated: 0, skipped: 0, failed: 0 };
  }

  logger.info("Fix pipeline: starting", { prId, count: findings.length });

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  await runInBatches(findings, CONCURRENCY, async (finding) => {
    try {
      const existing = await getFixByFindingId(finding.id, userId);
      if (existing) {
        skipped++;
        return;
      }

      const fix = await generateFixForFinding({
        finding: { ...finding, pr_id: prId },
        userId,
        repositoryId,
        files,
        metadata,
      });

      if (fix) generated++;
      else failed++;
    } catch (error) {
      failed++;
      logger.error("Fix pipeline: finding failed", {
        findingId: finding.id,
        error: (error as Error).message,
      });
    }
  });

  logger.info("Fix pipeline: complete", { prId, generated, skipped, failed });

  return { generated, skipped, failed };
};

export { deleteFixesByPR };

export const formatGitHubSuggestionBody = (fix: {
  issue: string;
  explanation: string;
  why_fix_works?: string | null;
  suggested_code: string;
  confidence: number;
}) => {
  const pct = Math.round(fix.confidence * 100);
  return [
    `### 🤖 Kodeye AI — Suggested Fix`,
    ``,
    `**${fix.issue}**`,
    ``,
    fix.explanation,
    ``,
    fix.why_fix_works ? `**Why this works:** ${fix.why_fix_works}` : "",
    ``,
    `Confidence: **${pct}%** (${confidenceLabel(fix.confidence)})`,
    ``,
    `\`\`\`suggestion`,
    fix.suggested_code,
    `\`\`\``,
  ]
    .filter(Boolean)
    .join("\n");
};
