"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchReviewBundle,
  subscribeReviewStream,
  type ReviewBundle,
} from "@/lib/review-api";

export function useReviewBundle(prId: string) {
  const [bundle, setBundle] = useState<ReviewBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!prId) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const debug =
        typeof window !== "undefined" &&
        (process.env.NEXT_PUBLIC_REVIEW_DEBUG === "1" ||
          new URLSearchParams(window.location.search).get("debug") === "1");
      const data = await fetchReviewBundle(prId, debug);
      setBundle(data);
    } catch {
      setError("Failed to load review data");
      setBundle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [prId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!prId) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void subscribeReviewStream(prId, (progress) => {
      setBundle((prev) =>
        prev
          ? {
              ...prev,
              progress,
              ai_review_status:
                progress.state === "completed"
                  ? "completed"
                  : progress.state !== "idle"
                    ? "processing"
                    : prev.ai_review_status,
            }
          : prev
      );
      if (progress.state === "completed") {
        load(true);
      }
    }).then((cleanup) => {
      if (cancelled) {
        cleanup();
      } else {
        unsubscribe = cleanup;
      }
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [prId, load]);

  return { bundle, loading, error, refreshing, reload: () => load(true) };
}
