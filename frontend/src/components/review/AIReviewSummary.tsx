"use client";

import { AlertCircle, Wrench } from "lucide-react";
import RiskScoreRing from "./RiskScoreRing";
import { normalizeRiskLevel } from "@/lib/severity-colors";

interface Props {
  score: number;
  riskLevel: string;
  issueCount: number;
  fixCount: number;
  loading?: boolean;
}

function SummarySkeleton() {
  return (
    <div className="ai-summary-content space-y-5">
      <div className="flex justify-center">
        <div className="analytics-skeleton-ring" />
      </div>
      <div className="flex justify-center">
        <div className="analytics-skeleton-chip" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="analytics-skeleton-tile h-[4.25rem]" />
        <div className="analytics-skeleton-tile h-[4.25rem]" />
      </div>
    </div>
  );
}

export default function AIReviewSummary({
  score,
  riskLevel,
  issueCount,
  fixCount,
  loading,
}: Props) {
  if (loading) return <SummarySkeleton />;

  const riskKey = normalizeRiskLevel(riskLevel);

  return (
    <div className="ai-summary-content">
      <div className="flex flex-col items-center">
        <RiskScoreRing score={score} size={168} strokeWidth={12} showLabel={false} />
        <span className="risk-status-chip mt-4" data-risk={riskKey}>
          {riskLevel} risk
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mt-5">
        <div className="micro-stat-tile group">
          <div className="micro-stat-icon micro-stat-icon-issues">
            <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="analytics-label">Issues</p>
            <p className="analytics-metric">{issueCount}</p>
          </div>
        </div>
        <div className="micro-stat-tile group">
          <div className="micro-stat-icon micro-stat-icon-fixes">
            <Wrench className="w-3.5 h-3.5" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="analytics-label">Fixes</p>
            <p className="analytics-metric">{fixCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
