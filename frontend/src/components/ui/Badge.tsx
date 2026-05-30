import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "success" | "warning" | "critical" | "info";

const variants: Record<BadgeVariant, string> = {
  default: "bg-kd-card border-kd-border text-kd-text-muted",
  success: "bg-kd-success/10 border-kd-success/30 text-kd-success",
  warning: "bg-kd-warning/10 border-kd-warning/30 text-kd-warning",
  critical: "bg-kd-critical/10 border-kd-critical/30 text-kd-critical",
  info: "bg-kd-info/10 border-kd-info/30 text-kd-info",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
