import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiApiKey } from "../../config/env";
import { parseAIResponse } from "../parser/response.parser";
import { validateIssues, AIReviewIssue } from "../parser/schema.validator";
import { buildStylePrompt } from "../prompts/style.prompt";
import { logger } from "../../utils/logger";

const AGENT_NAME = "StyleAgent";

export const runStyleAgent = async (
  diffContent: string
): Promise<AIReviewIssue[]> => {
  logger.info(`${AGENT_NAME}: Starting analysis`);

  const prompt = buildStylePrompt(diffContent);

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

    const styleIssues = issues.map((issue) => ({
      ...issue,
      category: "style" as const,
    }));

    logger.info(`${AGENT_NAME}: Analysis complete`, {
      issues: styleIssues.length,
    });

    return styleIssues;
  } catch (error) {
    logger.error(`${AGENT_NAME}: Analysis failed`, {
      error: (error as Error).message,
    });
    return [];
  }
};
