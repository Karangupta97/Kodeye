import { FixGenerationContext } from "./fix.schema";

export const buildFixPrompt = (ctx: FixGenerationContext): string => {
  return `You are a senior staff engineer generating a safe, minimal code fix for a pull request finding.

CRITICAL RULES:
- Respond with ONLY valid JSON. No markdown. No code fences. No prose outside JSON.
- suggestedCode must be complete, compilable replacement code for the vulnerable/problematic section.
- originalCode must match the problematic lines from the diff context.
- confidence is 0-100 (integer).
- Do not invent files or APIs not present in context.
- Never suggest executing shell commands or downloading untrusted content.
- Prefer parameterized queries, validation, async/await error handling, and idiomatic patterns for the language.

Repository: ${ctx.repositoryFullName}
PR Title: ${ctx.prTitle}
${ctx.prDescription ? `PR Description: ${ctx.prDescription}` : ""}
File: ${ctx.filePath}
Language: ${ctx.language}
Framework hints: ${ctx.frameworkHints}
Issue category: ${ctx.issueType}
Severity: ${ctx.severity}
Line: ${ctx.line}

Issue title: ${ctx.issueDescription}
Why it matters: ${ctx.issueWhy}
${ctx.existingFixHint ? `Reviewer hint: ${ctx.existingFixHint}` : ""}

Surrounding code context:
\`\`\`
${ctx.surroundingContext}
\`\`\`

Problematic code (original):
\`\`\`
${ctx.originalCode}
\`\`\`

Return exactly this JSON shape:
{
  "issue": "short issue title",
  "severity": "${ctx.severity}",
  "confidence": 85,
  "explanation": "why this is a problem",
  "originalCode": "exact problematic code",
  "suggestedCode": "fixed code block",
  "whyFixWorks": "why the suggested change resolves the issue"
}`;
};
