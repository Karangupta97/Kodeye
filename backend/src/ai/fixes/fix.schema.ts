import { z } from "zod";

export const AIFixResponseSchema = z.object({
  issue: z.string().min(1),
  severity: z.string().min(1),
  confidence: z.coerce.number().min(0).max(100),
  explanation: z.string().min(1),
  originalCode: z.string().min(1),
  suggestedCode: z.string().min(1),
  whyFixWorks: z.string().min(1),
});

export type AIFixResponse = z.infer<typeof AIFixResponseSchema>;

export interface FixGenerationContext {
  prTitle: string;
  prDescription?: string;
  repositoryFullName: string;
  filePath: string;
  language: string;
  frameworkHints: string;
  issueType: string;
  issueDescription: string;
  issueWhy: string;
  severity: string;
  line: number;
  originalCode: string;
  surroundingContext: string;
  existingFixHint?: string;
}
