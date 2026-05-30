import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6",
        className
      )}
      role="status"
    >
      <div className="w-14 h-14 rounded-2xl bg-kd-primary/10 flex items-center justify-center mb-4 border border-kd-primary/20">
        <Icon className="w-7 h-7 text-kd-glow" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-kd-text">{title}</h3>
      <p className="text-sm text-kd-text-muted mt-2 max-w-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
