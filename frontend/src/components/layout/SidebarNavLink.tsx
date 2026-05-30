"use client";

import Link from "next/link";
import type { NavItem } from "@/lib/navigation";
import { isNavItemActive } from "@/lib/navigation";
import { cn } from "@/lib/cn";

interface SidebarNavLinkProps {
  item: NavItem;
  pathname: string;
  collapsed?: boolean;
}

export function SidebarNavLink({
  item,
  pathname,
  collapsed = false,
}: SidebarNavLinkProps) {
  const Icon = item.icon;
  const active = isNavItemActive(pathname, item.id);

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kd-primary/50",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
        active
          ? "bg-kd-primary/20 text-kd-glow border border-kd-primary/30 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--kd-glow)_25%,transparent)]"
          : "text-kd-text-muted hover:text-kd-text hover:bg-kd-card/50 border border-transparent"
      )}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-kd-glow"
          aria-hidden
        />
      )}
      <Icon
        className={cn(
          "w-[18px] h-[18px] shrink-0 transition-colors",
          active ? "text-kd-glow" : ""
        )}
        aria-hidden
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
