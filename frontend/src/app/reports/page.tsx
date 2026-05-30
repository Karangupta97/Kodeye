"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { BarChart3, GitBranch, Activity } from "lucide-react";

interface Metrics {
  repositories: number;
  pullRequests: number;
  webhookEvents: number;
}

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<Metrics>("/api/metrics")
      .then(setMetrics)
      .catch(() => setError("Failed to load report metrics."));
  }, []);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      <PageHeader
        title="Reports"
        description="Workspace activity and review coverage summary."
      />

      {error ? (
        <ErrorState message={error} />
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
