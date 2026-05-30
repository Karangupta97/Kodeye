import { EventEmitter } from "events";

export type ReviewProgressState =
  | "idle"
  | "preparing_context"
  | "running_security"
  | "running_bug"
  | "running_performance"
  | "calculating_risk"
  | "posting_comments"
  | "completed"
  | "failed";

export interface ReviewProgressUpdate {
  prId: string;
  state: ReviewProgressState;
  message: string;
  progress: number;
  agents?: Array<{
    id: string;
    name: string;
    status: "pending" | "running" | "completed" | "failed";
    findingsCount: number;
    executionTimeMs: number;
  }>;
}

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

const progressByPr = new Map<string, ReviewProgressUpdate>();

export const setReviewProgress = (update: ReviewProgressUpdate) => {
  progressByPr.set(update.prId, update);
  emitter.emit(`progress:${update.prId}`, update);
  emitter.emit("progress", update);
};

export const getReviewProgress = (prId: string): ReviewProgressUpdate => {
  return (
    progressByPr.get(prId) || {
      prId,
      state: "idle",
      message: "No active review",
      progress: 0,
    }
  );
};

export const subscribeReviewProgress = (
  prId: string,
  listener: (update: ReviewProgressUpdate) => void
) => {
  const key = `progress:${prId}`;
  emitter.on(key, listener);
  return () => emitter.off(key, listener);
};

export const clearReviewProgress = (prId: string) => {
  progressByPr.delete(prId);
};
