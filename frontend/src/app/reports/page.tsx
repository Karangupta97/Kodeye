"use client";

import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { BarChart3, GitBranch, Activity } from "lucide-react";
import { useMetrics } from "@/hooks/useApiQueries";

export default function ReportsPage() {
  const { data: metrics, error, refetch } = useMetrics();

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      <PageHeader
        title="Reports"
        description="Workspace activity and review coverage summary."
      />

      {error ? (
        <ErrorState message="Failed to load report metrics." onRetry={() => refetch()} />
      ) : (
        <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: GitBranch, label: "Repositories", value: metrics?.repositories ?? "—" },
            { icon: BarChart3, label: "Pull requests", value: metrics?.pullRequests ?? "—" },
            { icon: Activity, label: "Webhook events", value: metrics?.webhookEvents ?? "—" },
          ].map((row) => (
            <div key={row.label} className="stat-card">
              <row.icon className="w-5 h-5 text-kd-glow mb-3" />
              <p className="text-2xl font-bold text-kd-text">{row.value}</p>
              <p className="text-sm text-kd-text-muted mt-1">{row.label}</p>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
