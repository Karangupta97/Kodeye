"use client";

import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/PageHeader";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { Plug } from "lucide-react";

export default function IntegrationsPage() {
  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;
  const installUrl = appSlug
    ? `https://github.com/apps/${appSlug}/installations/new`
    : null;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect external tools to your Kodeye workspace."
      />

      <motion.div variants={fadeInUp} className="kd-settings-section glass-card">
        <div className="kd-settings-row">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-kd-card flex items-center justify-center border border-kd-border">
              <svg className="w-5 h-5 text-kd-text" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-kd-text">GitHub App</p>
              <p className="text-xs text-kd-text-muted mt-1 max-w-md">
                Install the Kodeye GitHub App on your organization or account to sync
                repositories and run AI reviews on pull requests.
              </p>
            </div>
          </div>
          {installUrl ? (
            <a href={installUrl} target="_blank" rel="noreferrer" className="btn-primary text-sm">
              Configure
            </a>
          ) : (
            <span className="text-xs text-kd-text-muted">Set NEXT_PUBLIC_GITHUB_APP_SLUG</span>
          )}
        </div>
        <div className="kd-settings-row">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-kd-card flex items-center justify-center border border-kd-border">
              <Plug className="w-5 h-5 text-kd-text-muted" />
            </div>
            <div>
              <p className="text-sm font-semibold text-kd-text">Jira</p>
              <p className="text-xs text-kd-text-muted mt-1">Create tickets from AI findings — coming soon.</p>
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full border border-kd-border text-kd-text-muted">
            Soon
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
