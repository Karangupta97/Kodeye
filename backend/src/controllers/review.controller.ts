import { Request, Response } from "express";
import { env } from "../config/env";
import { getAuthedUserId } from "../middleware/requireAuth";
import { logger } from "../utils/logger";
import {
  requirePullRequest,
  requireRepository,
  ResourceNotFoundError,
} from "../utils/ownership";
import {
  buildDisplayTimeline,
  buildReviewMetadata,
  resolveReviewFiles,
} from "../utils/reviewBundleEnrichment";
import {
  getAiReviewById,
  listReviewsByPR,
} from "../services/aiReviews.service";
import { getRiskScoreByPR } from "../services/riskScores.service";
import {
  listReviewEvents,
  seedDefaultTimeline,
  appendReviewEvent,
} from "../services/reviewEvents.service";
import {
  upsertFindingInteraction,
  listInteractionsForFindings,
  FindingAction,
} from "../services/findingInteractions.service";
import {
  getReviewProgress,
  subscribeReviewProgress,
} from "../services/reviewProgress.service";
import { getPullRequest as fetchGHPullRequest } from "../github/pr.service";
import { triggerAIReview } from "./aiReview.controller";
import { listFixesByPR, getFixStatsForPR } from "../services/reviewFixes.service";
import { confidenceLabel } from "../ai/fixes/fix.validator";

const SEVERITY_MAP: Record<string, string> = {
  critical: "critical",
  warning: "high",
  suggestion: "medium",
  info: "low",
  high: "high",
  medium: "medium",
  low: "low",
};

const normalizeSeverity = (severity: string) =>
  SEVERITY_MAP[severity.toLowerCase()] || severity.toLowerCase();

const computeAgents = (reviews: any[]) => {
  const agentDefs = [
    { id: "security", name: "Security Agent", categories: ["security"] },
    { id: "bug", name: "Bug Agent", categories: ["bug"] },
    { id: "performance", name: "Performance Agent", categories: ["performance"] },
    { id: "style", name: "Code Style Agent", categories: ["style"] },
    { id: "architecture", name: "Architecture Agent", categories: ["architecture"] },
  ];

  return agentDefs.map((agent) => {
    const findings = reviews.filter((r) =>
      agent.categories.includes(r.category)
    );
    return {
      id: agent.id,
      name: agent.name,
      status: findings.length > 0 ? "completed" : "completed",
      findingsCount: findings.length,
      executionTimeMs: findings.length > 0 ? 1200 + findings.length * 180 : 0,
    };
  });
};

const computeBreakdown = (reviews: any[]) => {
  const categories = [
    { key: "security", label: "Security" },
    { key: "bug", label: "Bugs" },
    { key: "performance", label: "Performance" },
    { key: "style", label: "Code Quality" },
  ];

  const total = reviews.length || 1;

  return categories.map((cat) => {
    const items = reviews.filter((r) => r.category === cat.key);
    const critical = items.filter(
      (r) => normalizeSeverity(r.severity) === "critical"
    ).length;
    return {
      category: cat.label,
      key: cat.key,
      issueCount: items.length,
      percentage: Math.round((items.length / total) * 100),
      severity:
        critical > 0 ? "critical" : items.length > 0 ? "high" : "low",
    };
  });
};

const computeSeverityCounts = (reviews: any[]) => {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const r of reviews) {
    const s = normalizeSeverity(r.severity);
    if (s in counts) {
      counts[s as keyof typeof counts]++;
    }
  }
  return counts;
};

const computeCategoryCounts = (reviews: any[]) => {
  const keys = ["security", "bug", "performance", "style", "architecture"];
  return keys.map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1).replace("_", " "),
    count: reviews.filter((r) => r.category === key).length,
  }));
};

const enrichFindings = (
  reviews: any[],
  interactions: Map<string, string[]>,
  fixesByFinding: Map<string, any>
) =>
  reviews.map((r) => {
    const aiFix = fixesByFinding.get(r.id);
    return {
      ...r,
      severity: normalizeSeverity(r.severity),
      display_severity:
        normalizeSeverity(r.severity).charAt(0).toUpperCase() +
        normalizeSeverity(r.severity).slice(1),
      impact: r.why,
      reference:
        r.category === "security"
          ? "OWASP Top 10"
          : r.category === "bug"
            ? "CWE Common Weakness"
            : "Best Practices",
      interactions: interactions.get(r.id) || [],
      ai_fix: aiFix
        ? {
            id: aiFix.id,
            original_code: aiFix.original_code,
            suggested_code: aiFix.suggested_code,
            explanation: aiFix.explanation,
            why_fix_works: aiFix.why_fix_works,
            confidence: aiFix.confidence,
            confidence_percent: Math.round(aiFix.confidence * 100),
            confidence_label: confidenceLabel(aiFix.confidence),
            start_line: aiFix.start_line,
            end_line: aiFix.end_line,
            status: aiFix.status,
          }
        : null,
    };
  });

export const getReviewBundle = async (req: Request, res: Response) => {
  const prId = Array.isArray(req.params.prId)
    ? req.params.prId[0]
    : req.params.prId;
  const userId = getAuthedUserId(req);

  try {
    const pullRequest = await requirePullRequest(prId, userId);
    const repository = await requireRepository(pullRequest.repo_id, userId);
    const [reviews, riskScore, fixes, fixStats] = await Promise.all([
      listReviewsByPR(prId, userId),
      getRiskScoreByPR(prId, userId),
      listFixesByPR(prId, userId),
      getFixStatsForPR(prId, userId),
    ]);

    const files = await resolveReviewFiles({
      prId,
      installationId: repository.installation_id,
      owner: repository.owner,
      repoName: repository.repo_name,
      pullNumber: pullRequest.pr_number,
      findings: reviews,
    });

    const findingIds = reviews.map((r: any) => r.id).filter(Boolean);
    const interactions = await listInteractionsForFindings(findingIds, userId);
    const fixesByFinding = new Map(
      fixes.map((f: any) => [f.finding_id, f])
    );
    const enrichedReviews = enrichFindings(reviews, interactions, fixesByFinding);

    let ghMeta: {
      base_branch?: string;
      commits_count?: number;
      github_url?: string;
      description?: string;
    } = {};

    try {
      const ghPR = await fetchGHPullRequest({
        installationId: repository.installation_id,
        owner: repository.owner,
        repo: repository.repo_name,
        pullNumber: pullRequest.pr_number,
      });
      ghMeta = {
        base_branch: ghPR.base?.ref,
        commits_count: ghPR.commits,
        github_url: ghPR.html_url,
        description: ghPR.body || undefined,
      };
    } catch {
      ghMeta.github_url = `https://github.com/${repository.full_name}/pull/${pullRequest.pr_number}`;
    }

    const overallScore = riskScore?.overall_score ?? 0;
    const timeline = await seedDefaultTimeline(prId, userId, {
      prNumber: pullRequest.pr_number,
      author: pullRequest.author,
      fileCount: files.length,
      hasReview: reviews.length > 0,
      issueCount: reviews.length,
      riskScore: overallScore,
    });

    const persistedEvents = await listReviewEvents(prId, userId);
    const agents = computeAgents(reviews);
    const displayTimeline = buildDisplayTimeline({
      persistedEvents,
      seededEvents: timeline,
      agents,
      fixStats: {
        fixes_generated: fixStats.total,
        total: fixStats.total,
      },
      hasReview: reviews.length > 0,
      prCreatedAt: pullRequest.created_at,
    });
    const reviewMetadata = buildReviewMetadata({
      repositoryFullName: repository.full_name,
      branch: pullRequest.branch,
      baseBranch: ghMeta.base_branch || "main",
      commitCount: ghMeta.commits_count ?? 1,
      files,
      riskScoreCreatedAt: riskScore?.created_at ?? null,
      firstFindingAt: reviews[0]?.created_at ?? null,
      timeline: displayTimeline,
    });
    const progress = getReviewProgress(prId);

    const reviewCompletedEvent = persistedEvents.some(
      (e) => e.event_type === "review_completed"
    );
    const isProcessing = Boolean(
      progress.state &&
        !["idle", "completed", "failed"].includes(progress.state)
    );

    let ai_review_status: "pending" | "processing" | "completed";
    if (isProcessing) {
      ai_review_status = "processing";
    } else if (
      reviews.length > 0 ||
      reviewCompletedEvent ||
      riskScore != null
    ) {
      ai_review_status = "completed";
    } else {
      ai_review_status = "pending";
    }

    const riskLevel =
      overallScore >= 75
        ? "Critical"
        : overallScore >= 50
          ? "High"
          : overallScore >= 25
            ? "Medium"
            : "Low";

    res.json({
      data: {
        pull_request: {
          id: pullRequest.id,
          pr_number: pullRequest.pr_number,
          title: pullRequest.title,
          branch: pullRequest.branch,
          base_branch: ghMeta.base_branch || "main",
          author: pullRequest.author,
          author_avatar_url: `https://github.com/${pullRequest.author}.png`,
          status: pullRequest.status,
          created_at: pullRequest.created_at,
          commits_count: ghMeta.commits_count ?? 1,
          github_url: ghMeta.github_url,
          description: ghMeta.description,
        },
        repository: {
          id: repository.id,
          repo_name: repository.repo_name,
          full_name: repository.full_name,
          owner: repository.owner,
        },
        files,
        findings: enrichedReviews,
        risk_score: {
          overall_score: overallScore,
          security_score: riskScore?.security_score ?? 0,
          performance_score: riskScore?.performance_score ?? 0,
          maintainability_score: riskScore?.maintainability_score ?? 0,
          architecture_score: Math.round(
            (riskScore?.maintainability_score ?? 0) * 0.85
          ),
          risk_level: riskLevel,
        },
        breakdown: computeBreakdown(reviews),
        severity_counts: computeSeverityCounts(reviews),
        category_counts: computeCategoryCounts(reviews),
        agents,
        timeline: displayTimeline.map((e) => ({
          id: e.id,
          label: e.label,
          detail: e.detail,
          timestamp: e.timestamp,
          status: e.status,
          event_type: e.event_type,
          duration_ms: e.duration_ms,
          icon: e.icon,
        })),
        review_metadata: reviewMetadata,
        progress,
        fix_suggestions: {
          total_findings: reviews.length,
          fixes_generated: fixStats.total,
          high_confidence: fixStats.high_confidence,
          applied: fixStats.applied,
          rejected: fixStats.rejected,
          acceptance_rate: fixStats.acceptance_rate,
          average_confidence: fixStats.average_confidence,
        },
        fix_records: fixes.map((f: any) => {
          const finding = reviews.find((r: any) => r.id === f.finding_id);
          return {
            id: f.id,
            finding_id: f.finding_id,
            file_path: f.file_path,
            start_line: f.start_line,
            end_line: f.end_line,
            issue_type: f.issue_type,
            severity: f.severity,
            original_code: f.original_code,
            suggested_code: f.suggested_code,
            explanation: f.explanation,
            why_fix_works: f.why_fix_works,
            confidence: f.confidence,
            confidence_percent: Math.round(f.confidence * 100),
            confidence_label: confidenceLabel(f.confidence),
            status: f.status,
            issue_title: finding?.issue ?? "Finding",
          };
        }),
        ai_review_status,
        ...(req.query.debug === "1"
          ? {
              debug: {
                pr_id: prId,
                findings_count: reviews.length,
                fixes_count: fixes.length,
                agents_count: computeAgents(reviews).length,
                has_risk_score: riskScore != null,
                risk_overall: overallScore,
                review_completed_event: reviewCompletedEvent,
                progress_state: progress.state,
              },
            }
          : {}),
      },
    });

    logger.info("GET /api/reviews/:prId bundle", {
      prId,
      findings: reviews.length,
      fixes: fixes.length,
      ai_review_status,
      overall_score: overallScore,
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return res.status(404).json({ error: "Pull request not found" });
    }
    logger.error("GET /api/reviews/:prId failed", {
      prId,
      error: (error as Error).message,
    });
    res.status(500).json({ error: "Failed to load review" });
  }
};

export const reanalyzeReview = async (req: Request, res: Response) => {
  req.params.id = Array.isArray(req.params.prId)
    ? req.params.prId[0]
    : req.params.prId;
  return triggerAIReview(req, res);
};

export const shareReview = async (req: Request, res: Response) => {
  const prId = Array.isArray(req.params.prId)
    ? req.params.prId[0]
    : req.params.prId;

  try {
    await requirePullRequest(prId, getAuthedUserId(req));
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return res.status(404).json({ error: "Pull request not found" });
    }
    throw error;
  }

  res.json({
    data: {
      share_url: `${env.frontendUrl}/reviews/${prId}`,
      expires_at: null,
    },
  });
};

export const exportReview = async (req: Request, res: Response) => {
  const prId = Array.isArray(req.params.prId)
    ? req.params.prId[0]
    : req.params.prId;
  const format = (req.query.format as string) || "json";
  const userId = getAuthedUserId(req);

  try {
    const pullRequest = await requirePullRequest(prId, userId);
    const repository = await requireRepository(pullRequest.repo_id, userId);
    const [reviews, riskScore] = await Promise.all([
      listReviewsByPR(prId, userId),
      getRiskScoreByPR(prId, userId),
    ]);

    const bundle = {
      repository: repository.full_name,
      pull_request: `#${pullRequest.pr_number} ${pullRequest.title}`,
      exported_at: new Date().toISOString(),
      risk_score: riskScore,
      findings: reviews,
    };

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="kodeye-review-${pullRequest.pr_number}.json"`
      );
      return res.send(JSON.stringify(bundle, null, 2));
    }

    if (format === "markdown" || format === "md") {
      const md = [
        `# Kodeye AI Review — ${repository.full_name}`,
        ``,
        `**${pullRequest.title}** (#${pullRequest.pr_number})`,
        ``,
        `## Risk Score: ${riskScore?.overall_score ?? 0}/100`,
        ``,
        `| Security | Performance | Maintainability |`,
        `|----------|-------------|-----------------|`,
        `| ${riskScore?.security_score ?? 0} | ${riskScore?.performance_score ?? 0} | ${riskScore?.maintainability_score ?? 0} |`,
        ``,
        `## Findings (${reviews.length})`,
        ``,
        ...reviews.map(
          (r: any, i: number) =>
            `### ${i + 1}. [${r.severity}] ${r.issue}\n\n- **File:** \`${r.file}:${r.line}\`\n- **Category:** ${r.category}\n- **Why:** ${r.why}\n- **Fix:** ${r.fix}\n- **Confidence:** ${Math.round(r.confidence * 100)}%\n`
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/markdown");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="kodeye-review-${pullRequest.pr_number}.md"`
      );
      return res.send(md);
    }

    if (format === "pdf") {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kodeye Review</title>
<style>body{font-family:system-ui;max-width:800px;margin:40px auto;padding:0 20px;color:#111}
h1{color:#7C3AED}h2{border-bottom:1px solid #eee;padding-bottom:8px}
.finding{margin:16px 0;padding:16px;border:1px solid #eee;border-radius:8px}
.sev{font-weight:bold;text-transform:uppercase;font-size:12px}</style></head><body>
<h1>Kodeye AI Review</h1>
<p><strong>${repository.full_name}</strong> — PR #${pullRequest.pr_number}</p>
<h2>${pullRequest.title}</h2>
<p>Risk Score: <strong>${riskScore?.overall_score ?? 0}/100</strong></p>
<h2>Findings</h2>
${reviews
  .map(
    (r: any) =>
      `<div class="finding"><span class="sev">${r.severity}</span> <strong>${r.issue}</strong><br>
<small>${r.file}:${r.line}</small><p>${r.why}</p><pre>${r.fix}</pre></div>`
  )
  .join("")}
</body></html>`;

      res.setHeader("Content-Type", "text/html");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="kodeye-review-${pullRequest.pr_number}.html"`
      );
      return res.send(html);
    }

    res.status(400).json({ error: "Unsupported format. Use json, markdown, or pdf" });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return res.status(404).json({ error: "Pull request not found" });
    }
    res.status(500).json({ error: "Export failed" });
  }
};

export const updateFindingInteraction = async (req: Request, res: Response) => {
  const findingId = Array.isArray(req.params.findingId)
    ? req.params.findingId[0]
    : req.params.findingId;
  const { action } = req.body as {
    action: FindingAction;
  };

  const valid: FindingAction[] = [
    "thumbs_up",
    "thumbs_down",
    "mark_fixed",
    "dismiss",
  ];

  if (!valid.includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  try {
    const userId = getAuthedUserId(req);
    const finding = await getAiReviewById(findingId, userId);
    if (!finding) {
      return res.status(404).json({ error: "Finding not found" });
    }

    const result = await upsertFindingInteraction(
      findingId,
      action,
      userId
    );
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to save interaction" });
  }
};

export const streamReviewProgress = async (req: Request, res: Response) => {
  const prId = Array.isArray(req.params.prId)
    ? req.params.prId[0]
    : req.params.prId;

  try {
    await requirePullRequest(prId, getAuthedUserId(req));
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return res.status(404).json({ error: "Pull request not found" });
    }
    throw error;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send(getReviewProgress(prId));

  const unsubscribe = subscribeReviewProgress(prId, (update) => {
    send(update);
  });

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
};

export const recordReviewRunEvents = async (prId: string, userId: string) => {
  await appendReviewEvent({
    pr_id: prId,
    user_id: userId,
    event_type: "ai_review_started",
    label: "AI Review Started",
    detail: "Multi-agent pipeline running",
    status: "running",
  });
};
