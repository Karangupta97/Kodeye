"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PullRequestRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      router.replace(`/reviews/${params.id}`);
    }
  }, [params.id, router]);

  return (
    <div className="glass-card p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 text-kd-text-muted">
        <div className="spinner" />
        <span>Opening AI review...</span>
      </div>
    </div>
  );
}
