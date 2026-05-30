import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiApiKey, getGeminiModel } from "../../config/env";
import { parseAIResponse } from "../parser/response.parser";
import { validateIssues, AIReviewIssue } from "../parser/schema.validator";
import { buildSecurityPrompt } from "../prompts/security.prompt";
import { logger } from "../../utils/logger";

const AGENT_NAME = "SecurityAgent";

export const runSecurityAgent = async (
  diffContent: string
): Promise<AIReviewIssue[]> => {
  logger.info(`${AGENT_NAME}: Starting analysis`);

  const prompt = buildSecurityPrompt(diffContent);

  try {
    const genAI = new GoogleGenerativeAI(getGeminiApiKey());
    const model = genAI.getGenerativeModel({ model: getGeminiModel() });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    logger.debug(`${AGENT_NAME}: Raw response length`, {
      length: text.length,
    });

    const parsed = parseAIResponse(text);
    const issues = validateIssues(parsed);

    // Force category to security
    const securityIssues = issues.map((issue) => ({
      ...issue,
      category: "security" as const,
    }));

    logger.info(`${AGENT_NAME}: Analysis complete`, {
      issues: securityIssues.length,
    });

    return securityIssues;
  } catch (error) {
    logger.error(`${AGENT_NAME}: Analysis failed`, {
      error: (error as Error).message,
    });
    return [];
  }
};
