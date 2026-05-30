import { z } from "zod";
import { logger } from "../../utils/logger";

export const SeverityEnum = z.enum(["critical", "warning", "suggestion", "info"]);
export const CategoryEnum = z.enum(["security", "bug", "performance", "style"]);

export const AIReviewIssueSchema = z.object({
  severity: SeverityEnum.catch("suggestion"),
  category: CategoryEnum.catch("style"),
  file: z.string().min(1),
  line: z.coerce.number().int().positive(),
  issue: z.string().min(1),
  why: z.string().min(1),
  fix: z.string().min(1),
  confidence: z.coerce.number().min(0).max(1),
});

export type AIReviewIssue = z.infer<typeof AIReviewIssueSchema>;
export type Severity = z.infer<typeof SeverityEnum>;
export type Category = z.infer<typeof CategoryEnum>;

const MIN_CONFIDENCE = 0.5;

/**
 * Validates and filters AI review issues from parsed JSON.
 * Returns only valid issues that pass schema validation and confidence threshold.
 */
export const validateIssues = (parsed: unknown): AIReviewIssue[] => {
  if (!Array.isArray(parsed)) {
    logger.warn("AI response is not an array", { type: typeof parsed });
    return [];
  }

  const validIssues: AIReviewIssue[] = [];
  let invalidCount = 0;
  let lowConfidenceCount = 0;

  for (const item of parsed) {
    const result = AIReviewIssueSchema.safeParse(item);

    if (!result.success) {
      invalidCount++;
      logger.debug("Invalid AI review issue skipped", {
        errors: result.error.issues.map((i) => i.message).join(", "),
        input: JSON.stringify(item).substring(0, 200),
      });
      continue;
    }

    if (result.data.confidence < MIN_CONFIDENCE) {
      lowConfidenceCount++;
      continue;
    }

    validIssues.push(result.data);
  }

  if (invalidCount > 0 || lowConfidenceCount > 0) {
    logger.info("AI issue validation summary", {
      total: parsed.length,
      valid: validIssues.length,
      invalid: invalidCount,
      lowConfidence: lowConfidenceCount,
    });
  }

  return validIssues;
};

/**
 * Deduplicates issues by file + line + category combination.
 * Keeps the issue with highest confidence when duplicates are found.
 */
export const deduplicateIssues = (issues: AIReviewIssue[]): AIReviewIssue[] => {
  const seen = new Map<string, AIReviewIssue>();

  for (const issue of issues) {
    const key = `${issue.file}:${issue.line}:${issue.category}`;
    const existing = seen.get(key);

    if (!existing || issue.confidence > existing.confidence) {
      seen.set(key, issue);
    }
  }

  return Array.from(seen.values());
};
