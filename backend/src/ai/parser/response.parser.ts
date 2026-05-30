import { logger } from "../../utils/logger";

/**
 * Parses potentially messy AI responses into clean JSON.
 * Handles markdown code fences, mixed text, and partial JSON.
 */
export const parseAIResponse = (raw: string): unknown => {
  const trimmed = raw.trim();

  // Attempt 1: Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to fallback strategies
  }

  // Attempt 2: Extract from markdown code fences
  const fenceMatch = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/.exec(trimmed);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // Attempt 3: Find JSON array in mixed text
  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    const extracted = trimmed.substring(arrayStart, arrayEnd + 1);
    try {
      return JSON.parse(extracted);
    } catch {
      // Continue to bracket balancing
    }

    // Attempt 4: Bracket balancing for truncated JSON
    const balanced = balanceBrackets(extracted);
    if (balanced) {
      try {
        return JSON.parse(balanced);
      } catch {
        // Continue
      }
    }
  }

  // Attempt 5: Find JSON object in text
  const objStart = trimmed.indexOf("{");
  const objEnd = trimmed.lastIndexOf("}");
  if (objStart !== -1 && objEnd > objStart) {
    const extracted = trimmed.substring(objStart, objEnd + 1);
    try {
      const parsed = JSON.parse(extracted);
      // Wrap single object in array
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Continue
    }
  }

  // Attempt 6: If the response looks like it should be empty
  if (
    trimmed.includes("no issues") ||
    trimmed.includes("No issues") ||
    trimmed.includes("looks good") ||
    trimmed === "[]"
  ) {
    return [];
  }

  logger.warn("Failed to parse AI response after all attempts", {
    rawLength: raw.length,
    preview: raw.substring(0, 200),
  });

  return [];
};

/**
 * Attempts to fix truncated JSON by balancing brackets.
 */
const balanceBrackets = (input: string): string | null => {
  let bracketDepth = 0;
  let braceDepth = 0;
  let inString = false;
  let escapeNext = false;
  let lastValidIndex = -1;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "[") {
      bracketDepth++;
    }
    if (char === "]") {
      bracketDepth--;
    }
    if (char === "{") {
      braceDepth++;
    }
    if (char === "}") {
      braceDepth--;
      if (bracketDepth === 1 && braceDepth === 0) {
        lastValidIndex = i;
      }
    }
  }

  if (lastValidIndex > 0 && bracketDepth > 0) {
    // Truncate after the last complete object and close the array
    return input.substring(0, lastValidIndex + 1) + "]";
  }

  return null;
};
