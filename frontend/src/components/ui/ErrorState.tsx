import { AlertCircle } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-xl border border-kd-critical/30 bg-kd-critical/5 p-6 text-center"
      role="alert"
    >
      <AlertCircle className="w-8 h-8 text-kd-critical mx-auto mb-3" aria-hidden />
      <h3 className="text-sm font-semibold text-kd-text">{title}</h3>
      <p className="text-sm text-kd-text-muted mt-2">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
