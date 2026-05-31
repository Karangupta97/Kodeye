"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Lock, Unlock, GitBranch } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListItemSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { useRepositories } from "@/hooks/useApiQueries";

const container = staggerContainer;
const item = fadeInUp;

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }
  return new Date(value).toLocaleDateString();
};

export default function RepositoriesPage() {
  const { data: repositories = [], isLoading, error, refetch } = useRepositories();

  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;
  const installUrl = appSlug
    ? `https://github.com/apps/${appSlug}/installations/new`
    : null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <PageHeader
        title="Repositories"
        description="Manage GitHub repositories connected to Kodeye AI."
        actions={
          installUrl ? (
            <a href={installUrl} target="_blank" rel="noreferrer" className="btn-primary text-sm">
              Install GitHub App
            </a>
          ) : undefined
        }
      />

      <motion.div variants={item} className="glass-card p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ListItemSkeleton />
            <ListItemSkeleton />
          </div>
        ) : error ? (
          <ErrorState message="Failed to load repositories." onRetry={() => refetch()} />
        ) : repositories.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No repositories yet"
            description="Install the GitHub App to connect repositories and start AI reviews."
            action={
              installUrl ? (
                <a href={installUrl} target="_blank" rel="noreferrer" className="btn-primary text-sm">
                  Install GitHub App
                </a>
              ) : undefined
            }
          />
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
                    Connected
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
