import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shimmer rounded-lg bg-kd-border/40", className)}
      aria-hidden
      {...props}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <Skeleton className="h-10 w-10 rounded-xl mb-3" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="rounded-xl border border-kd-border bg-kd-bg/40 p-5 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}
