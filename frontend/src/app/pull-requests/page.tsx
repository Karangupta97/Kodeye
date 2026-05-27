"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import { ArrowUpRight, GitPullRequest, GitBranch, User } from "lucide-react";

interface RepositoryInfo {
  id: string;
  repo_name: string;
  full_name: string;
}

interface PullRequestRecord {
  id: string;
  pr_number: number;
  title: string;
  branch: string;
  author: string;
  status: string;
  created_at: string;
  repository: RepositoryInfo | null;
}

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
};

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }
  return new Date(value).toLocaleString();
};

export default function PullRequestsPage() {
  const [pullRequests, setPullRequests] = useState<PullRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchApi<PullRequestRecord[]>("/api/pull-requests");
        if (active) {
          setPullRequests(data);
        }
      } catch {
        if (active) {
          setPullRequests([]);
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
  }, []);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-6"
    >
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-kd-text">
            Pull Requests
          </h1>
          <p className="text-sm text-kd-text-muted mt-1">
            Track webhook activity and inline comment status.
          </p>
        </div>
      </motion.div>

      <motion.div variants={item} className="glass-card p-6">
        {loading ? (
          <div className="flex items-center gap-3 text-kd-text-muted">
            <div className="spinner" />
            <span>Loading pull requests...</span>
          </div>
        ) : pullRequests.length === 0 ? (
          <p className="text-sm text-kd-text-muted">
            No pull requests synced yet.
          </p>
        ) : (
          <div className="space-y-4">
            {pullRequests.map((pullRequest) => (
              <div
                key={pullRequest.id}
                className="rounded-xl border border-kd-border bg-kd-bg/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-kd-text">
                      {pullRequest.title}
                    </p>
                    <p className="text-xs text-kd-text-muted mt-1">
                      {pullRequest.repository?.full_name || "Unknown repo"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-kd-border text-kd-text-muted">
                    {pullRequest.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs text-kd-text-muted">
                  <span className="flex items-center gap-1">
                    <GitPullRequest className="w-3 h-3" />
                    PR #{pullRequest.pr_number}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    {pullRequest.branch}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {pullRequest.author}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-4 text-xs text-kd-text-muted">
                  <span>Updated {formatTimestamp(pullRequest.created_at)}</span>
                  <Link
                    href={`/pull-requests/${pullRequest.id}`}
                    className="inline-flex items-center gap-1 text-kd-accent hover:text-kd-glow transition-colors"
                  >
                    View details
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
