import { logger } from "../utils/logger";
import {
  buildPRContext,
  formatContextForAI,
  PRFileInfo,
  PRMetadata,
} from "./context/context.builder";
import { runSecurityAgent } from "./agents/security.agent";
import { runBugAgent } from "./agents/bug.agent";
import { runPerformanceAgent } from "./agents/performance.agent";
import { runStyleAgent } from "./agents/style.agent";
import { deduplicateIssues, AIReviewIssue } from "./parser/schema.validator";
import { calculateRiskScores, RiskScores } from "./risk/risk.engine";
import {
  formatIssueAsComment,
  formatSummaryComment,
} from "./formatter/github.formatter";
import { postInlineComment } from "../github/comment.service";
import { logWebhookEvent } from "../services/webhookLogs.service";
import { getInstallationOctokit } from "../github/octokit";
import { insertReviews, deleteReviewsByPR } from "../services/aiReviews.service";
import { upsertRiskScore } from "../services/riskScores.service";
import { deleteFixesByPR, generateFixesForPR } from "./fixes/fix.service";
import { parsePatch } from "../utils/diff";
import { analyzeDiffForStaticIssues } from "./static/diff.analyzer";

export interface AIReviewResult {
  issues: AIReviewIssue[];
  riskScores: RiskScores;
  commentsPosted: number;
  duration: number;
}

export interface ReviewRequest {
  prId: string;
  repositoryId: string;
  prNumber: number;
  prTitle: string;
  prDescription?: string;
  prAuthor: string;
  prBranch: string;
  commitSha: string;
  repositoryFullName: string;
  owner: string;
  repo: string;
  installationId: number;
  files: PRFileInfo[];
}

/**
 * Main AI review orchestrator.
 * Coordinates multi-agent analysis, risk scoring, and GitHub comment posting.
 */
export const runAIReview = async (
  request: ReviewRequest
): Promise<AIReviewResult> => {
  const startTime = Date.now();
  const { prId, prNumber } = request;

  logger.info("AI Review: Starting", {
    prId,
    prNumber,
    filesCount: request.files.length,
  });

  // ── Phase 1: Build context ────────────────────────────
  const metadata: PRMetadata = {
    title: request.prTitle,
    description: request.prDescription,
    author: request.prAuthor,
    branch: request.prBranch,
    prNumber: request.prNumber,
    repositoryFullName: request.repositoryFullName,
  };

  const context = buildPRContext(metadata, request.files);
  const diffContent = formatContextForAI(context);

  if (!diffContent || diffContent.trim().length < 50) {
    logger.info("AI Review: No meaningful diff content", { prId });
    return {
      issues: [],
      riskScores: {
        overallRisk: 0,
        securityRisk: 0,
        performanceRisk: 0,
        maintainability: 0,
      },
      commentsPosted: 0,
      duration: Date.now() - startTime,
    };
  }

  // ── Phase 2: Run all agents concurrently ──────────────
  logger.info("AI Review: Running multi-agent analysis", { prId });

  const agentResults = await Promise.allSettled([
    runSecurityAgent(diffContent),
    runBugAgent(diffContent),
    runPerformanceAgent(diffContent),
    runStyleAgent(diffContent),
  ]);

  const allIssues: AIReviewIssue[] = [];
  const agentNames = ["Security", "Bug", "Performance", "Style"];

  agentResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      allIssues.push(...result.value);
      logger.info(`AI Review: ${agentNames[index]} agent complete`, {
        issues: result.value.length,
      });
    } else {
      logger.error(`AI Review: ${agentNames[index]} agent failed`, {
        error: result.reason?.message || "Unknown error",
      });
    }
  });

  // ── Phase 2b: Static diff analysis (JSON/config syntax, etc.) ──
  const staticIssues = analyzeDiffForStaticIssues(request.files);
  if (staticIssues.length > 0) {
    allIssues.push(...staticIssues);
    logger.info("AI Review: Static analyzer findings", {
      count: staticIssues.length,
    });
  }

  // ── Phase 3: Deduplicate ──────────────────────────────
  const deduplicated = deduplicateIssues(allIssues);
  logger.info("AI Review: Deduplication complete", {
    before: allIssues.length,
    after: deduplicated.length,
    static: staticIssues.length,
    ai: allIssues.length - staticIssues.length,
  });

  // ── Phase 4: Risk scoring ─────────────────────────────
  const riskScores = calculateRiskScores(
    deduplicated,
    context.fileList,
    context.totalAdditions,
    context.totalDeletions
  );

  logger.info("AI Review: Risk scores calculated", { riskScores });

  // ── Phase 5: Store results ────────────────────────────
  let insertedFindings: Array<{
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
  }> = [];

  try {
    await deleteFixesByPR(prId);
    await deleteReviewsByPR(prId);

    if (deduplicated.length > 0) {
      insertedFindings = await insertReviews(
        prId,
        deduplicated.map((issue) => ({
          severity: issue.severity,
          category: issue.category,
          file: issue.file,
          line: issue.line,
          issue: issue.issue,
          why: issue.why,
          fix: issue.fix,
          confidence: issue.confidence,
        }))
      );

      if (insertedFindings.length !== deduplicated.length) {
        logger.warn("AI Review: Insert count mismatch", {
          expected: deduplicated.length,
          inserted: insertedFindings.length,
        });
      }
    }

    await upsertRiskScore(prId, {
      overall_score: riskScores.overallRisk,
      security_score: riskScores.securityRisk,
      performance_score: riskScores.performanceRisk,
      maintainability_score: riskScores.maintainability,
    });

    logger.info("AI Review: Results stored in database", {
      prId,
      issues: deduplicated.length,
      persisted: insertedFindings.length,
    });
  } catch (error) {
    logger.error("AI Review: Failed to store results", {
      prId,
      error: (error as Error).message,
    });
    throw error;
  }

  // ── Phase 5b: Generate AI code fixes ───────────────────
  if (insertedFindings.length > 0) {
    try {
      const fixResult = await generateFixesForPR({
        prId,
        repositoryId: request.repositoryId,
        findings: insertedFindings.map((row) => ({
          id: row.id,
          pr_id: prId,
          severity: row.severity,
          category: row.category,
          file: row.file,
          line: row.line,
          issue: row.issue,
          why: row.why,
          fix: row.fix,
          confidence: row.confidence,
        })),
        files: request.files,
        metadata: {
          title: request.prTitle,
          description: request.prDescription,
          repositoryFullName: request.repositoryFullName,
        },
      });
      logger.info("AI Review: Fix generation complete", { prId, ...fixResult });
    } catch (error) {
      logger.error("AI Review: Fix generation failed", {
        prId,
        error: (error as Error).message,
      });
    }
  }

  // ── Phase 6: Post GitHub comments ─────────────────────
  let commentsPosted = 0;

  try {
    // Post inline comments for each issue
    for (const issue of deduplicated) {
      try {
        // Find the matching file to validate line number is in the diff
        const matchingFile = request.files.find(
          (f) => f.filename === issue.file
        );

        if (!matchingFile || !matchingFile.patch) {
          logger.debug("AI Review: Skipping comment — no patch for file", {
            file: issue.file,
          });
          continue;
        }

        // Validate line is in the diff
        const parsed = parsePatch(matchingFile.patch);
        const lineInDiff = parsed.lines.some(
          (l) => l.newLine === issue.line && (l.type === "add" || l.type === "context")
        );

        if (!lineInDiff) {
          logger.debug("AI Review: Skipping comment — line not in diff", {
            file: issue.file,
            line: issue.line,
          });
          continue;
        }

        const body = formatIssueAsComment(issue);

        await postInlineComment({
          installationId: request.installationId,
          owner: request.owner,
          repo: request.repo,
          pullNumber: request.prNumber,
          commitId: request.commitSha,
          path: issue.file,
          line: issue.line,
          body,
        });

        commentsPosted++;
      } catch (error) {
        logger.error("AI Review: Failed to post inline comment", {
          file: issue.file,
          line: issue.line,
          error: (error as Error).message,
        });
      }
    }

    // Post summary comment as a regular PR comment
    try {
      const octokit = getInstallationOctokit(request.installationId);
      const summary = formatSummaryComment(deduplicated, riskScores.overallRisk);

      await octokit.issues.createComment({
        owner: request.owner,
        repo: request.repo,
        issue_number: request.prNumber,
        body: summary,
      });

      logger.info("AI Review: Summary comment posted", {
        prNumber: request.prNumber,
      });
    } catch (error) {
      logger.error("AI Review: Failed to post summary comment", {
        error: (error as Error).message,
      });
    }

    logger.info("AI Review: GitHub comments posted", {
      prId,
      commentsPosted,
      totalIssues: deduplicated.length,
    });

  } catch (error) {
    logger.error("AI Review: Comment posting failed", {
      prId,
      error: (error as Error).message,
    });
  }

  const duration = Date.now() - startTime;
  logger.info("AI Review: Complete", {
    prId,
    issues: deduplicated.length,
    riskScores,
    commentsPosted,
    duration: `${duration}ms`,
  });

  try {
    await logWebhookEvent({
      event_type: "kodeye_ai_review",
      action: commentsPosted > 0 ? "comments_posted" : "completed",
      repository: `${request.owner}/${request.repo}`,
      payload: {
        pull_request: { number: request.prNumber },
        comments_posted: commentsPosted,
        issues_found: deduplicated.length,
        pr_id: prId,
      },
    });
  } catch {
    /* non-fatal */
  }

  return {
    issues: deduplicated,
    riskScores,
    commentsPosted,
    duration,
  };
};
