"use client";

import { motion } from "framer-motion";

interface RiskScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

const getRiskColor = (score: number): string => {
  if (score >= 81) return "var(--kd-critical)";
  if (score >= 61) return "#F97316";
  if (score >= 31) return "var(--kd-warning)";
  return "var(--kd-success)";
};

const getRiskLabel = (score: number): string => {
  if (score >= 81) return "Critical";
  if (score >= 61) return "High";
  if (score >= 31) return "Medium";
  return "Low";
};

export default function RiskScoreRing({
  score,
  size = 140,
  strokeWidth = 10,
  label,
}: RiskScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getRiskColor(score);
  const riskLabel = label || getRiskLabel(score);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--kd-border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-kd-text-muted mt-0.5">{riskLabel}</span>
      </div>
    </div>
  );
}
