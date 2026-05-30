import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiApiKey } from "../../config/env";
import { parseAIResponse } from "../parser/response.parser";
import { validateIssues, AIReviewIssue } from "../parser/schema.validator";
import { buildReviewPrompt } from "../prompts/review.prompt";
import { logger } from "../../utils/logger";

const AGENT_NAME = "BugAgent";

const BUG_PROMPT_OVERRIDE = `You are a senior software engineer specializing in bug detection and logic error analysis.

Analyze the provided code diff EXCLUSIVELY for bugs and logic errors.

FOCUS AREAS:
- Null/undefined reference errors — accessing properties on potentially null values
- Async/await mistakes — missing await, unhandled promise rejections
- Race conditions — shared state mutations without synchronization
- Incorrect boolean conditions — off-by-one, wrong operators, inverted logic
- Logical mistakes — wrong variable used, incorrect algorithm implementation
- Promise handling issues — missing .catch(), swallowed errors
- Type coercion bugs — loose equality with unexpected types
- Array/object mutation bugs — modifying arrays during iteration
- Missing edge case handling — empty arrays, zero values, negative numbers
- Incorrect error handling — catching and silently ignoring errors
- State management bugs — stale closures, missing dependency arrays in hooks

RULES:
- Return ONLY a valid JSON array
- Category MUST be "bug" for all findings
- Only report genuine bugs — not stylistic preferences
- If no bugs found, return: []
- Focus on the NEW code (+ lines in the diff)

RESPONSE FORMAT:
[{
  "severity": "critical" | "warning" | "suggestion",
  "category": "bug",
  "file": "path/to/file",
  "line": 42,
  "issue": "Brief bug description",
  "why": "Impact and how this bug manifests",
  "fix": "Fix with code example",
  "confidence": 0.0 to 1.0
}]`;

export const runBugAgent = async (
  diffContent: string
): Promise<AIReviewIssue[]> => {
  logger.info(`${AGENT_NAME}: Starting analysis`);

  const prompt = `${BUG_PROMPT_OVERRIDE}\n\n=== CODE DIFF TO ANALYZE ===\n${diffContent}`;

  try {
    const genAI = new GoogleGenerativeAI(getGeminiApiKey());
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    logger.debug(`${AGENT_NAME}: Raw response length`, {
      length: text.length,
    });

    const parsed = parseAIResponse(text);
    const issues = validateIssues(parsed);

    const bugIssues = issues.map((issue) => ({
      ...issue,
      category: "bug" as const,
    }));

    logger.info(`${AGENT_NAME}: Analysis complete`, {
      issues: bugIssues.length,
    });

    return bugIssues;
  } catch (error) {
    logger.error(`${AGENT_NAME}: Analysis failed`, {
      error: (error as Error).message,
    });
    return [];
  }
};
