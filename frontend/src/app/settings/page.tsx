"use client";

import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { Moon, User } from "lucide-react";

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="max-w-2xl mx-auto space-y-6"
    >
      <PageHeader
        title="Settings"
        description="Account preferences and appearance."
      />

      <motion.section variants={fadeInUp} className="kd-settings-section glass-card">
        <h2 className="kd-heading-2 flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-kd-glow" aria-hidden />
          Account
        </h2>
        <div className="kd-settings-row">
          <div>
            <p className="text-sm font-medium text-kd-text">GitHub profile</p>
            <p className="text-xs text-kd-text-muted mt-0.5">
              @{profile?.username || user?.email?.split("@")[0] || "—"}
            </p>
          </div>
          {profile?.avatar_url && (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full ring-2 ring-kd-primary/30"
            />
          )}
        </div>
        <div className="kd-settings-row">
          <div>
            <p className="text-sm font-medium text-kd-text">Email</p>
            <p className="text-xs text-kd-text-muted mt-0.5">
              {profile?.email || user?.email || "—"}
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section variants={fadeInUp} className="kd-settings-section glass-card">
        <h2 className="kd-heading-2 flex items-center gap-2 mb-4">
          <Moon className="w-5 h-5 text-kd-glow" aria-hidden />
          Appearance
        </h2>
        <div className="kd-settings-row">
          <div>
            <p className="text-sm font-medium text-kd-text">Theme</p>
            <p className="text-xs text-kd-text-muted mt-0.5">
              {mounted ? `Current: ${theme === "light" ? "Light" : "Dark"}` : "Loading…"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`filter-btn ${mounted && theme === "dark" ? "filter-btn-active" : ""}`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`filter-btn ${mounted && theme === "light" ? "filter-btn-active" : ""}`}
            >
              Light
            </button>
            <ThemeToggle />
          </div>
        </div>
      </motion.section>

      <motion.p variants={fadeInUp} className="text-xs text-kd-text-muted text-center">
        Manage{" "}
        <Link href="/integrations" className="text-kd-accent hover:text-kd-glow">
          integrations
        </Link>{" "}
        and{" "}
        <Link href="/team" className="text-kd-accent hover:text-kd-glow">
          team
        </Link>{" "}
        from the sidebar.
      </motion.p>
    </motion.div>
  );
}
