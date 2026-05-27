"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import { ArrowUpRight, Lock, Unlock, GitBranch } from "lucide-react";

interface RepositoryRecord {
  id: string;
  repo_name: string;
  full_name: string;
  private: boolean;
  installation_id: number;
  created_at?: string;
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
  return new Date(value).toLocaleDateString();
};

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<RepositoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;
  const installUrl = appSlug
    ? `https://github.com/apps/${appSlug}/installations/new`
    : null;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchApi<RepositoryRecord[]>("/api/repositories");
        if (active) {
          setRepositories(data);
        }
      } catch {
        if (active) {
          setRepositories([]);
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
      <motion.div variants={item} className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-kd-text">
              Repositories
            </h1>
            <p className="text-sm text-kd-text-muted mt-1">
              Manage GitHub repositories connected to Kodeye AI.
            </p>
          </div>
          {installUrl ? (
            <a
              href={installUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary text-sm"
            >
              Install GitHub App
            </a>
          ) : (
            <p className="text-xs text-kd-text-muted">
              Set NEXT_PUBLIC_GITHUB_APP_SLUG to enable installs.
            </p>
          )}
        </div>
      </motion.div>

      <motion.div variants={item} className="glass-card p-6">
        {loading ? (
          <div className="flex items-center gap-3 text-kd-text-muted">
            <div className="spinner" />
            <span>Loading repositories...</span>
          </div>
        ) : repositories.length === 0 ? (
          <div className="text-sm text-kd-text-muted">
            No repositories connected yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="rounded-xl border border-kd-border bg-kd-bg/40 p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-kd-text">
                      {repo.repo_name}
                    </p>
                    <p className="text-xs text-kd-text-muted">
                      {repo.full_name}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-kd-border text-kd-text-muted">
                    {repo.private ? (
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Private
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Unlock className="w-3 h-3" /> Public
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-kd-text-muted">
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    Installation #{repo.installation_id}
                  </span>
                  <span>Connected {formatTimestamp(repo.created_at)}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <Link
                    href="/pull-requests"
                    className="text-kd-accent hover:text-kd-glow transition-colors"
                  >
                    View pull requests
                  </Link>
                  <a
                    href={`https://github.com/${repo.full_name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-kd-text-muted hover:text-kd-text transition-colors"
                  >
                    Open on GitHub
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
