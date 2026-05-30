"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function LandingAuthBanner() {
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  return (
    <div className="mb-6 inline-flex flex-wrap items-center justify-center gap-3 px-4 py-2 rounded-full border border-kd-primary/30 bg-kd-primary/10 text-sm">
      <span className="text-kd-text-muted">Signed in as</span>
      <span className="font-medium text-kd-text">
        {user.user_metadata?.user_name || user.email}
      </span>
      <Link href="/overview" className="text-kd-glow font-semibold hover:underline">
        Go to dashboard →
      </Link>
    </div>
  );
}
