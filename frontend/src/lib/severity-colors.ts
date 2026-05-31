import type { SeverityKey } from "@/lib/review-bundle-utils";

export const SEV_COLORS: Record<
  SeverityKey,
  { base: string; light: string; glow: string }
> = {
  critical: { base: "#FF4D4F", light: "#FF7875", glow: "rgba(255,77,79,0.45)" },
  high: { base: "#FF7A45", light: "#FF9C6E", glow: "rgba(255,122,69,0.4)" },
  medium: { base: "#FFA940", light: "#FFC069", glow: "rgba(255,169,64,0.4)" },
  low: { base: "#52C41A", light: "#73D13D", glow: "rgba(82,196,26,0.4)" },
};

export function severityGradient(key: SeverityKey): string {
  const c = SEV_COLORS[key];
  return `linear-gradient(90deg, ${c.base}, ${c.light})`;
}

export function riskGaugeGradient(score: number): [string, string] {
  if (score >= 61) return ["#FF7A45", "#FF4D4F"];
  if (score >= 31) return ["#FFA940", "#FF7A45"];
  return ["#52C41A", "#73D13D"];
}

export function normalizeRiskLevel(level: string): string {
  return level.trim().toLowerCase();
}

export const RISK_CHIP_STYLES: Record<
  string,
  { bg: string; text: string; border: string; glow: string }
> = {
  critical: {
    bg: "rgba(255,77,79,0.12)",
    text: "#FF4D4F",
    border: "rgba(255,77,79,0.35)",
    glow: "rgba(255,77,79,0.3)",
  },
  high: {
    bg: "rgba(255,122,69,0.12)",
    text: "#FF7A45",
    border: "rgba(255,122,69,0.35)",
    glow: "rgba(255,122,69,0.28)",
  },
  medium: {
    bg: "rgba(255,169,64,0.12)",
    text: "#FFA940",
    border: "rgba(255,169,64,0.35)",
    glow: "rgba(255,169,64,0.28)",
  },
  low: {
    bg: "rgba(82,196,26,0.12)",
    text: "#52C41A",
    border: "rgba(82,196,26,0.35)",
    glow: "rgba(82,196,26,0.28)",
  },
};

export function riskChipStyle(level: string) {
  const key = normalizeRiskLevel(level);
  return RISK_CHIP_STYLES[key] ?? RISK_CHIP_STYLES.medium;
}
