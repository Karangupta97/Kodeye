import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiApiKey, getGeminiModel } from "../../config/env";
import { parseAIResponse } from "../parser/response.parser";
import { logger } from "../../utils/logger";
import { buildFixPrompt } from "./fix.prompt";
import { validateFixResponse } from "./fix.validator";
import { FixGenerationContext } from "./fix.schema";
import { AIFixResponse } from "./fix.schema";

export const runFixAgent = async (
  ctx: FixGenerationContext
): Promise<AIFixResponse | null> => {
  const prompt = buildFixPrompt(ctx);

  try {
    const genAI = new GoogleGenerativeAI(getGeminiApiKey());
    const model = genAI.getGenerativeModel({
      model: getGeminiModel(),
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = parseAIResponse(text);

    const payload = Array.isArray(parsed) ? parsed[0] : parsed;
    return validateFixResponse(payload, ctx.originalCode);
  } catch (error) {
    logger.error("FixAgent: generation failed", {
      file: ctx.filePath,
      line: ctx.line,
      error: (error as Error).message,
    });
    return null;
  }
};
