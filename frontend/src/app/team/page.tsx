"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/PageHeader";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { Users } from "lucide-react";

export default function TeamPage() {
  const { user, profile } = useAuth();

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage workspace members and permissions."
      />

      <motion.div variants={fadeInUp} className="glass-card p-6">
        <div className="flex items-center gap-4 p-4 rounded-xl border border-kd-border bg-kd-bg/40">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-kd-primary/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-kd-glow" />
            </div>
          )}
          <div>
            <p className="font-semibold text-kd-text">
              {profile?.username || "You"}
            </p>
            <p className="text-sm text-kd-text-muted">{profile?.email || user?.email}</p>
            <p className="text-xs text-kd-success mt-1">Owner</p>
          </div>
        </div>
        <p className="text-sm text-kd-text-muted mt-6 text-center">
          Team invites and role management will be available in a future release.
        </p>
      </motion.div>
    </motion.div>
  );
}
