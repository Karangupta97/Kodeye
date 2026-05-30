"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useUIStore } from "@/stores/ui-store";
import { MAIN_NAV, MGMT_NAV, getPageTitle } from "@/lib/navigation";
import { SidebarNavLink } from "@/components/layout/SidebarNavLink";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserDropdown } from "@/components/ui/UserDropdown";
import {
  Sparkles,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

interface AppShellProps {
  children: ReactNode;
  immersive?: boolean;
}

export default function AppShell({ children, immersive = false }: AppShellProps) {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    mobileNavOpen,
    toggleSidebar,
    setMobileNavOpen,
  } = useUIStore();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  const sidebarWidth = sidebarCollapsed ? "w-[72px]" : "w-64";
  const pageTitle = getPageTitle(pathname);

  const SidebarInner = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      <div
        className={`flex items-center gap-2.5 h-16 border-b border-kd-border shrink-0 ${
          collapsed ? "justify-center px-2" : "px-5"
        }`}
      >
        <Link
          href="/overview"
          className={`flex items-center gap-2.5 min-w-0 ${collapsed ? "" : "flex-1"}`}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-kd-primary to-kd-glow flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" aria-hidden />
          </div>
          {!collapsed && (
            <>
              <span className="text-lg font-bold tracking-tight text-kd-text truncate">
                Kodeye
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-kd-primary/15 text-kd-glow border border-kd-primary/20 shrink-0">
                AI
              </span>
            </>
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Main">
        <div>
          {!collapsed && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-kd-text-muted px-3 mb-2">
              Navigation
            </p>
          )}
          <div className="space-y-0.5" role="list">
            {MAIN_NAV.map((item) => (
              <SidebarNavLink
                key={item.id}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
              />
            ))}
          </div>
        </div>
        <div>
          {!collapsed && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-kd-text-muted px-3 mb-2">
              Management
            </p>
          )}
          <div className="space-y-0.5" role="list">
            {MGMT_NAV.map((item) => (
              <SidebarNavLink
                key={item.id}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
              />
            ))}
          </div>
        </div>
      </nav>

      <div
        className={`px-3 py-4 border-t border-kd-border shrink-0 ${
          collapsed ? "flex justify-center" : ""
        }`}
      >
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-9 h-9 rounded-full ring-2 ring-kd-primary/30"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-kd-primary/20 flex items-center justify-center text-kd-glow text-sm font-bold">
                {(profile?.username || user?.email || "U")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-kd-text truncate">
                {profile?.username || "User"}
              </p>
              <p className="text-xs text-kd-text-muted truncate">
                {profile?.email || user?.email}
              </p>
            </div>
            <ThemeToggle />
          </div>
        ) : (
          <ThemeToggle />
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-kd-bg overflow-x-hidden">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <aside
        className={`hidden lg:flex flex-col border-r border-kd-border bg-kd-surface/50 backdrop-blur-xl fixed inset-y-0 left-0 z-40 transition-[width] duration-300 ${sidebarWidth}`}
        aria-label="Sidebar"
      >
        <SidebarInner collapsed={sidebarCollapsed} />
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-kd-border bg-kd-card flex items-center justify-center text-kd-text-muted hover:text-kd-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kd-primary"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-3.5 h-3.5" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-black/60"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col bg-kd-surface border-r border-kd-border shadow-2xl"
            >
              <button
                type="button"
                className="absolute top-4 right-4 p-2 text-kd-text-muted hover:text-kd-text rounded-lg focus-visible:ring-2 focus-visible:ring-kd-primary"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarInner />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div
        className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ${
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
        }`}
      >
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 h-14 sm:h-16 px-4 sm:px-6 border-b border-kd-border bg-kd-surface/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg border border-kd-border text-kd-text-muted hover:text-kd-text focus-visible:ring-2 focus-visible:ring-kd-primary"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-medium text-kd-text truncate">{pageTitle}</p>
              <p className="text-[11px] text-kd-text-muted hidden sm:block truncate">
                Kodeye AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <UserDropdown />
          </div>
        </header>

        <main
          id="main-content"
          className={
            immersive
              ? "flex-1 min-h-0 overflow-hidden"
              : "flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8"
          }
        >
          {immersive ? children : <div className="kd-container">{children}</div>}
        </main>
      </div>
    </div>
  );
}
