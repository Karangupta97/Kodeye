"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface ReviewProcessingProps {
  isProcessing: boolean;
  onComplete?: () => void;
}

const steps = [
  { label: "Analyzing PR diff...", icon: "🔍", duration: 2000 },
  { label: "Running security scan...", icon: "🔒", duration: 3000 },
  { label: "Detecting bugs...", icon: "🐛", duration: 2500 },
  { label: "Checking performance...", icon: "⚡", duration: 2000 },
  { label: "Reviewing code quality...", icon: "🎨", duration: 2000 },
  { label: "Calculating risk score...", icon: "📊", duration: 1500 },
  { label: "Posting GitHub comments...", icon: "💬", duration: 2000 },
] as const;

function KodeyeEyeIcon() {
  return (
    <motion.div
      className="review-eye-icon"
      animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg
        viewBox="0 0 40 40"
        className="w-4 h-4"
        fill="none"
        aria-hidden
      >
        <path
          d="M20 8C12 8 5.5 14 3 20c2.5 6 9 12 17 12s14.5-6 17-12c-2.5-6-9-12-17-12z"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="20" r="6" fill="currentColor" />
        <circle cx="20" cy="20" r="2.5" className="fill-kd-primary" />
      </svg>
    </motion.div>
  );
}

export default function ReviewProcessing({
  isProcessing,
}: ReviewProcessingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isProcessing) {
      setCurrentStep(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev >= steps.length - 1 ? prev : prev + 1));
    }, 2500);

    return () => clearInterval(interval);
  }, [isProcessing]);

  if (!isProcessing) {
    return null;
  }

  const progressPct = ((currentStep + 1) / steps.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="review-processing-panel"
    >
      <div className="review-processing-glow" aria-hidden />

      <div className="relative z-[1]">
        <div className="flex items-start gap-3 mb-5">
          <KodeyeEyeIcon />
          <div className="min-w-0 pt-0.5">
            <h3 className="text-[15px] font-semibold text-kd-text leading-snug">
              AI Review in Progress
            </h3>
            <p className="text-xs text-kd-text-muted mt-0.5 leading-relaxed">
              Running multi-agent analysis across your pull request
            </p>
          </div>
        </div>

        <div className="review-progress-wrap mb-5">
          <div className="review-progress-track">
            <motion.div
              className="review-progress-fill"
              initial={{ width: "0%" }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>

        <div className="review-steps" role="list">
          {steps.map((step, idx) => {
            const status =
              idx < currentStep
                ? "done"
                : idx === currentStep
                  ? "active"
                  : "pending";

            return (
              <motion.div
                key={step.label}
                role="listitem"
                initial={
                  status === "active"
                    ? { opacity: 0, x: -6 }
                    : { opacity: status === "pending" ? 0.6 : 0.85, x: 0 }
                }
                animate={{
                  opacity: status === "pending" ? 1 : 1,
                  x: 0,
                }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={`review-step review-step--${status}`}
              >
                <div className="review-step-icon">
                  <span className="review-step-emoji">{step.icon}</span>
                </div>

                <span className="review-step-label flex-1 min-w-0 truncate">
                  {step.label}
                </span>

                {status === "done" && (
                  <Check
                    className="review-step-check shrink-0"
                    strokeWidth={2.5}
                    aria-label="Completed"
                  />
                )}
                {status === "active" && (
                  <Loader2
                    className="review-step-spinner shrink-0"
                    strokeWidth={2}
                    aria-label="In progress"
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
