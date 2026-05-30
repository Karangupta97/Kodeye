"use client";

import { motion, AnimatePresence } from "framer-motion";
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
];

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
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          return prev;
        }
        return prev + 1;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isProcessing]);

  if (!isProcessing) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass-card p-6 border border-kd-primary/20"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <div className="spinner-lg" />
          <div className="absolute inset-0 spinner-lg opacity-30 animate-ping" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-kd-text">
            🤖 AI Review in Progress
          </h3>
          <p className="text-xs text-kd-text-muted">
            Running multi-agent analysis...
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-kd-border/40 rounded-full mb-5 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-kd-primary to-kd-glow"
          initial={{ width: "0%" }}
          animate={{
            width: `${((currentStep + 1) / steps.length) * 100}%`,
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            boxShadow: "0 0 12px var(--kd-glow)",
          }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
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
              initial={{ opacity: 0 }}
              animate={{ opacity: status === "pending" ? 0.4 : 1 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                status === "active"
                  ? "bg-kd-primary/10 border border-kd-primary/20"
                  : ""
              }`}
            >
              <span className="text-base w-6 text-center">
                {status === "done" ? "✅" : step.icon}
              </span>
              <span
                className={`text-sm ${
                  status === "active"
                    ? "text-kd-glow font-medium"
                    : status === "done"
                      ? "text-kd-text-muted line-through"
                      : "text-kd-text-muted"
                }`}
              >
                {step.label}
              </span>
              {status === "active" && (
                <div className="ml-auto">
                  <div className="spinner" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
