import { AIFixResponseSchema, AIFixResponse } from "./fix.schema";
import { logger } from "../../utils/logger";

const MIN_CODE_LENGTH = 3;
const MIN_CONFIDENCE = 0.35;

const PLACEHOLDER_PATTERNS = [
  /^todo$/i,
  /^fixme$/i,
  /^your code here$/i,
  /^\.\.\.$/,
];

export const validateFixResponse = (
  parsed: unknown,
  originalSnippet: string
): AIFixResponse | null => {
  const result = AIFixResponseSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn("Fix validation failed: schema", {
      errors: result.error.issues.map((i) => i.message).join(", "),
    });
    return null;
  }

  const fix = result.data;

  if (fix.confidence < MIN_CONFIDENCE * 100) {
    logger.debug("Fix rejected: low confidence", { confidence: fix.confidence });
    return null;
  }

  if (fix.suggestedCode.trim().length < MIN_CODE_LENGTH) {
    logger.debug("Fix rejected: empty suggested code");
    return null;
  }

  if (
    PLACEHOLDER_PATTERNS.some((p) => p.test(fix.suggestedCode.trim())) ||
    PLACEHOLDER_PATTERNS.some((p) => p.test(fix.originalCode.trim()))
  ) {
    logger.debug("Fix rejected: placeholder content");
    return null;
  }

  if (fix.suggestedCode.trim() === fix.originalCode.trim()) {
    logger.debug("Fix rejected: no change from original");
    return null;
  }

  if (originalSnippet && fix.originalCode.trim().length < 2) {
    fix.originalCode = originalSnippet;
  }

  return fix;
};

export const confidenceLabel = (confidence0to1: number): string => {
  const pct = Math.round(confidence0to1 * 100);
  if (pct >= 90) return "Safe fix";
  if (pct >= 75) return "Likely fix";
  return "Needs manual review";
};
