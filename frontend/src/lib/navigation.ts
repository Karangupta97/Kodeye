import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  GitPullRequest,
  GitBranch,
  Sparkles,
  Shield,
  BarChart3,
  Plug,
  Users,
  Settings,
} from "lucide-react";

/** Every sidebar item has a unique href and stable id. */
export interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

export const MAIN_NAV: NavItem[] = [
  { id: "overview", href: "/overview", label: "Overview", icon: LayoutDashboard },
  { id: "pull-requests", href: "/pull-requests", label: "Pull Requests", icon: GitPullRequest },
  { id: "repositories", href: "/repositories", label: "Repositories", icon: GitBranch },
  { id: "ai-reviews", href: "/ai-reviews", label: "AI Reviews", icon: Sparkles },
  { id: "risk", href: "/risk-insights", label: "Risk Insights", icon: Shield },
  { id: "reports", href: "/reports", label: "Reports", icon: BarChart3 },
];

export const MGMT_NAV: NavItem[] = [
  { id: "integrations", href: "/integrations", label: "Integrations", icon: Plug },
  { id: "team", href: "/team", label: "Team", icon: Users },
  { id: "settings", href: "/settings", label: "Settings", icon: Settings },
];

export const ALL_NAV: NavItem[] = [...MAIN_NAV, ...MGMT_NAV];

/**
 * Returns exactly one active nav id for the current pathname.
 * More specific paths are checked first (e.g. /reviews/:id → ai-reviews).
 */
export function resolveActiveNavId(pathname: string): string {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";

  if (path.startsWith("/reviews/")) return "ai-reviews";
  if (path === "/ai-reviews" || path.startsWith("/ai-reviews/")) return "ai-reviews";
  if (path === "/pull-requests" || path.startsWith("/pull-requests/")) return "pull-requests";
  if (path === "/repositories" || path.startsWith("/repositories/")) return "repositories";
  if (path === "/risk-insights" || path.startsWith("/risk-insights/")) return "risk";
  if (path === "/reports" || path.startsWith("/reports/")) return "reports";
  if (path === "/integrations" || path.startsWith("/integrations/")) return "integrations";
  if (path === "/team" || path.startsWith("/team/")) return "team";
  if (path === "/settings" || path.startsWith("/settings/")) return "settings";
  if (path === "/overview" || path === "/dashboard") return "overview";

  return "overview";
}

export function isNavItemActive(pathname: string, itemId: string): boolean {
  return resolveActiveNavId(pathname) === itemId;
}

export function getPageTitle(pathname: string): string {
  const activeId = resolveActiveNavId(pathname);
  const item = ALL_NAV.find((n) => n.id === activeId);
  if (item) return item.label;
  if (pathname.startsWith("/reviews/")) return "AI Review";
  return "Overview";
}

export function getNavItemByHref(href: string): NavItem | undefined {
  return ALL_NAV.find((n) => n.href === href);
}
