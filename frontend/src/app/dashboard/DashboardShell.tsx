"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { UserDropdown } from "@/components/ui/UserDropdown";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  LayoutDashboard,
  GitBranch,
  GitPullRequest,
  Settings,
  Sparkles,
} from "lucide-react";
import { usePathname } from "next/navigation";

const sidebarLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/repositories", label: "Repositories", icon: GitBranch },
  { href: "/pull-requests", label: "Pull Requests", icon: GitPullRequest },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-kd-bg">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-kd-border bg-kd-surface/50 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-kd-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-kd-primary to-kd-glow flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-kd-text">
            Kodeye
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-kd-primary/15 text-kd-glow border border-kd-primary/20 ml-auto">
            AI
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-kd-primary/15 text-kd-glow border border-kd-primary/20"
                    : "text-kd-text-muted hover:text-kd-text hover:bg-kd-card/50"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 py-4 border-t border-kd-border">
          <div className="flex items-center gap-3 px-3 py-2">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username || "User"}
                className="w-8 h-8 rounded-full ring-2 ring-kd-primary/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-kd-primary/20 flex items-center justify-center text-kd-glow text-sm font-bold">
                {(profile?.username || user?.email || "U")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-kd-text truncate">
                {profile?.username || "User"}
              </p>
              <p className="text-xs text-kd-text-muted truncate">
                {profile?.email || user?.email || ""}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-kd-border bg-kd-surface/30 backdrop-blur-xl">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-kd-primary to-kd-glow flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-kd-text">Kodeye</span>
          </div>

          {/* Breadcrumb placeholder for desktop */}
          <div className="hidden lg:block">
            <h2 className="text-sm font-medium text-kd-text-muted">
              {sidebarLinks.find((l) => l.href === pathname)?.label ||
                "Dashboard"}
            </h2>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
