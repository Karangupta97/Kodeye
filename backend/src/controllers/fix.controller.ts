import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { getPullRequestById } from "../services/pullRequests.service";
import { getRepositoryById } from "../services/repositories.service";
import { listPullRequestFiles } from "../services/pullRequestFiles.service";
import {
  getFixByFindingId,
  listFixesByPR,
  updateFixStatus,
} from "../services/reviewFixes.service";
import { getDB } from "../db/supabase";
import {
  generateFixForFinding,
  formatGitHubSuggestionBody,
} from "../ai/fixes/fix.service";
import { getPullRequest as fetchGHPullRequest } from "../github/pr.service";
import { postInlineComment } from "../github/comment.service";
import { confidenceLabel } from "../ai/fixes/fix.validator";

const toFixResponse = (row: any) => ({
  id: row.id,
  finding_id: row.finding_id,
  file_path: row.file_path,
  start_line: row.start_line,
  end_line: row.end_line,
  issue_type: row.issue_type,
  severity: row.severity,
  original_code: row.original_code,
  suggested_code: row.suggested_code,
  explanation: row.explanation,
  why_fix_works: row.why_fix_works,
  confidence: row.confidence,
  confidence_percent: Math.round(row.confidence * 100),
  confidence_label: confidenceLabel(row.confidence),
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const getFindingFix = async (req: Request, res: Response) => {
  const findingId = Array.isArray(req.params.findingId)
    ? req.params.findingId[0]
    : req.params.findingId;

  try {
    const fix = await getFixByFindingId(findingId);
    if (!fix) {
      return res.status(404).json({ error: "No fix generated for this finding" });
    }
    res.json({ data: toFixResponse(fix) });
  } catch (error) {
    logger.error("GET finding fix failed", { findingId, error: (error as Error).message });
    res.status(500).json({ error: "Failed to load fix" });
  }
};

export const generateFindingFix = async (req: Request, res: Response) => {
  const findingId = Array.isArray(req.params.findingId)
    ? req.params.findingId[0]
    : req.params.findingId;
  const force = req.query.force === "1";

  try {
    const supabase = getDB();
    const { data: finding, error } = await supabase
      .from("ai_reviews")
      .select("*")
      .eq("id", findingId)
      .single();

    if (error || !finding) {
      return res.status(404).json({ error: "Finding not found" });
    }

    const pullRequest = await getPullRequestById(finding.pr_id);
    const repository = await getRepositoryById(pullRequest.repo_id);
    const files = await listPullRequestFiles(finding.pr_id);

    const fix = await generateFixForFinding({
      finding: {
        id: finding.id,
        pr_id: finding.pr_id,
        severity: finding.severity,
        category: finding.category,
        file: finding.file,
        line: finding.line,
        issue: finding.issue,
        why: finding.why,
        fix: finding.fix,
        confidence: finding.confidence,
      },
      repositoryId: repository.id,
      files,
      metadata: {
        title: pullRequest.title,
        repositoryFullName: repository.full_name,
      },
      force,
    });

    if (!fix) {
      return res.status(422).json({
        error: "Could not generate a confident fix for this finding",
      });
    }

    res.json({ data: toFixResponse(fix) });
  } catch (error) {
    logger.error("POST generate fix failed", { findingId, error: (error as Error).message });
    res.status(500).json({ error: "Fix generation failed" });
  }
};

export const postGitHubFixSuggestion = async (req: Request, res: Response) => {
  const findingId = Array.isArray(req.params.findingId)
    ? req.params.findingId[0]
    : req.params.findingId;

  try {
    const fix = await getFixByFindingId(findingId);
    if (!fix) {
      return res.status(404).json({ error: "No fix available" });
    }

    const pullRequest = await getPullRequestById(fix.pr_id);
    const repository = await getRepositoryById(pullRequest.repo_id);

    const ghPR = await fetchGHPullRequest({
      installationId: repository.installation_id,
      owner: repository.owner,
      repo: repository.repo_name,
      pullNumber: pullRequest.pr_number,
    });

    const body = formatGitHubSuggestionBody({
      issue: fix.explanation,
      explanation: fix.explanation,
      why_fix_works: fix.why_fix_works,
      suggested_code: fix.suggested_code,
      confidence: fix.confidence,
    });

    const comment = await postInlineComment({
      installationId: repository.installation_id,
      owner: repository.owner,
      repo: repository.repo_name,
      pullNumber: pullRequest.pr_number,
      commitId: ghPR.head.sha,
      path: fix.file_path,
      line: fix.end_line,
      body,
    });

    res.json({
      data: {
        posted: true,
        comment_id: comment.id,
        url: comment.html_url,
      },
    });
  } catch (error) {
    logger.error("POST GitHub suggestion failed", {
      findingId,
      error: (error as Error).message,
    });
    res.status(500).json({ error: "Failed to post GitHub suggestion" });
  }
};

export const updateFixStatusHandler = async (req: Request, res: Response) => {
  const findingId = Array.isArray(req.params.findingId)
    ? req.params.findingId[0]
    : req.params.findingId;
  const { status } = req.body as { status: "applied" | "rejected" };

  if (!["applied", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const fix = await updateFixStatus(findingId, status);
    res.json({ data: toFixResponse(fix) });
  } catch (error) {
    res.status(500).json({ error: "Failed to update fix status" });
  }
};

export const listPRFixes = async (req: Request, res: Response) => {
  const prId = Array.isArray(req.params.prId) ? req.params.prId[0] : req.params.prId;
  try {
    const fixes = await listFixesByPR(prId);
    res.json({ data: fixes.map(toFixResponse) });
  } catch {
    res.status(500).json({ error: "Failed to list fixes" });
  }
};
