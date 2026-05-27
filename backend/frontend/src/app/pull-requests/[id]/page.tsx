"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import { ArrowLeft, FileText, MessageSquare, GitBranch } from "lucide-react";

interface RepositoryInfo {
  id: string;
  full_name: string;
  repo_name: string;
}

interface PullRequestFile {
  id: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
  raw_url: string | null;
  blob_url: string | null;
}

interface PullRequestDetail {
  id: string;
  pr_number: number;
  title: string;
  branch: string;
  author: string;
  status: string;
  created_at: string;
  repository: RepositoryInfo | null;
  files: PullRequestFile[];
}

interface WebhookLogEntry {
  id: string;
  event_type: string;
  action: string | null;
  repository: string | null;
  created_at?: string;
  payload?: any;
}

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }
  return new Date(value).toLocaleString();
};

export default function PullRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<PullRequestDetail | null>(null);
  const [commentLog, setCommentLog] = useState<WebhookLogEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchApi<PullRequestDetail>(
          `/api/pull-requests/${params.id}`
        );
        const logs = await fetchApi<WebhookLogEntry[]>(
          "/api/webhook-logs?limit=50"
        );

        if (!active) {
          return;
        }

        const match = logs.find(
          (log) =>
            log.event_type === "comment_posted" &&
            log.payload?.pull_request === data.pr_number
        );

        setDetail(data);
        setCommentLog(match || null);
      } catch {
        if (active) {
          setDetail(null);
          setCommentLog(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [params.id]);

  const stats = useMemo(() => {
    if (!detail) {
      return { additions: 0, deletions: 0, changes: 0 };
    }

    return detail.files.reduce(
      (acc, file) => {
        acc.additions += file.additions;
        acc.deletions += file.deletions;
        acc.changes += file.changes;
        return acc;
      },
      { additions: 0, deletions: 0, changes: 0 }
    );
  }, [detail]);

  if (loading) {
    return (
      <div className="glass-card p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 text-kd-text-muted">
          <div className="spinner" />
          <span>Loading pull request...</span>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="glass-card p-6 max-w-5xl mx-auto text-kd-text-muted">
        Pull request not found.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link
            href="/pull-requests"
            className="inline-flex items-center gap-2 text-xs text-kd-text-muted hover:text-kd-text"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to pull requests
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-kd-text mt-2">
            {detail.title}
          </h1>
          <p className="text-sm text-kd-text-muted mt-1">
            {detail.repository?.full_name || "Unknown repository"} - PR #{detail.pr_number}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-kd-border text-kd-text-muted">
          {detail.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-kd-text-muted">Author</p>
          <p className="text-sm font-semibold text-kd-text mt-1">
            {detail.author}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-kd-text-muted">Branch</p>
          <p className="text-sm font-semibold text-kd-text mt-1 flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            {detail.branch}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-kd-text-muted">Opened</p>
          <p className="text-sm font-semibold text-kd-text mt-1">
            {formatTimestamp(detail.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-kd-text-muted">Additions</p>
          <p className="text-sm font-semibold text-kd-text mt-1">
            +{stats.additions}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-kd-text-muted">Deletions</p>
          <p className="text-sm font-semibold text-kd-text mt-1">
            -{stats.deletions}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-kd-text-muted">Files Changed</p>
          <p className="text-sm font-semibold text-kd-text mt-1">
            {detail.files.length}
          </p>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-kd-text">
              Inline Comment Status
            </h2>
            <p className="text-xs text-kd-text-muted">
              Tracks test review comments posted on GitHub.
            </p>
          </div>
          <MessageSquare className="w-4 h-4 text-kd-accent" />
        </div>
        {commentLog ? (
          <div className="rounded-xl border border-kd-border bg-kd-bg/40 p-4 text-sm">
            <p className="text-kd-text font-semibold">
              Comment posted
            </p>
            <p className="text-xs text-kd-text-muted mt-1">
              {formatTimestamp(commentLog.created_at)}
            </p>
            {commentLog.payload?.url && (
              <a
                href={commentLog.payload.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-kd-accent hover:text-kd-glow mt-2 inline-flex"
              >
                View on GitHub
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-kd-text-muted">
            No inline comment recorded yet.
          </p>
        )}
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-kd-accent" />
          <h2 className="text-lg font-semibold text-kd-text">
            Raw Patch Diffs
          </h2>
        </div>
        <div className="space-y-4">
          {detail.files.length === 0 ? (
            <p className="text-sm text-kd-text-muted">
              No file data stored for this pull request.
            </p>
          ) : (
            detail.files.map((file) => (
              <div
                key={file.id}
                className="rounded-xl border border-kd-border bg-kd-bg/40 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-kd-text">
                      {file.filename}
                    </p>
                    <p className="text-xs text-kd-text-muted">
                      {file.status} - +{file.additions} / -{file.deletions}
                    </p>
                  </div>
                  {file.blob_url && (
                    <a
                      href={file.blob_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-kd-accent hover:text-kd-glow"
                    >
                      View file
                    </a>
                  )}
                </div>
                {file.patch ? (
                  <pre className="text-xs text-kd-text-muted whitespace-pre-wrap font-mono rounded-lg border border-kd-border bg-black/60 p-4 overflow-x-auto">
                    {file.patch}
                  </pre>
                ) : (
                  <p className="text-xs text-kd-text-muted">
                    Binary or large file diff not available.
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
