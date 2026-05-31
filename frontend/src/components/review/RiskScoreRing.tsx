"use client";

import { motion } from "framer-motion";
import { riskGaugeGradient } from "@/lib/severity-colors";

interface RiskScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showLabel?: boolean;
}

export default function RiskScoreRing({
  score,
  size = 168,
  strokeWidth = 12,
  label,
  showLabel = true,
}: RiskScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const [gradStart, gradEnd] = riskGaugeGradient(score);
  const gradientId = `risk-gauge-${score}-${size}`;

  return (
    <div
      className="risk-score-ring relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradStart} />
            <stop offset="100%" stopColor={gradEnd} />
          </linearGradient>
          <filter id={`${gradientId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="risk-score-track"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          filter={`url(#${gradientId}-glow)`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="risk-score-value font-bold leading-none"
          style={{ fontSize: 48 }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          {score}
        </motion.span>
        {showLabel && label && (
          <span className="analytics-label mt-1.5">{label}</span>
        )}
      </div>
    </div>
  );
}
