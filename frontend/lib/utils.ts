import type { RiskBreakdown } from "./types";

// ============================================================
// RISK LEVEL CLASSIFICATION
// ============================================================

export function getRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" {
  if (score <= 40) return "LOW";
  if (score <= 70) return "MEDIUM";
  return "HIGH";
}

// ============================================================
// DECISION COLOR MAPPING
// ============================================================

export const DECISION_COLORS = {
  APPROVE: {
    bg: "bg-green-900 bg-opacity-20",
    text: "text-accent-approve",
    border: "border-accent-approve border-opacity-30",
    icon: "🟢",
  },
  VERIFY: {
    bg: "bg-yellow-900 bg-opacity-20",
    text: "text-accent-verify",
    border: "border-accent-verify border-opacity-30",
    icon: "🟡",
  },
  BLOCK: {
    bg: "bg-red-900 bg-opacity-20",
    text: "text-accent-block",
    border: "border-accent-block border-opacity-30",
    icon: "🔴",
  },
};

// ============================================================
// DECISION MESSAGES
// ============================================================

export const DECISION_MESSAGES: Record<string, string> = {
  APPROVE:
    "This transaction is considered low risk and has been approved automatically.",
  VERIFY:
    "This transaction requires additional verification before it can be processed.",
  BLOCK:
    "This transaction has been identified as high risk and has been blocked for security.",
};

// ============================================================
// FORMATTING UTILITIES
// ============================================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    timeStyle: "short",
  }).format(date);
}

// ============================================================
// RISK SCORING UTILITIES
// ============================================================

export function calculateWeightedRisk(breakdown: RiskBreakdown): number {
  const weights = {
    anomaly: 0.4,
    velocity: 0.25,
    receiver: 0.2,
    behavioral: 0.15,
  };

  return Math.round(
    breakdown.anomaly * weights.anomaly +
      breakdown.velocity * weights.velocity +
      breakdown.receiver * weights.receiver +
      breakdown.behavioral * weights.behavioral
  );
}

// ============================================================
// SALAMI ATTACK DETECTION UTILITIES
// ============================================================

export function getSalamiRiskLevel(
  indicators: string[],
  score: number
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  const indicatorCount = indicators.length;

  if (indicatorCount >= 5 || score > 80) return "CRITICAL";
  if (indicatorCount >= 3 || score > 65) return "HIGH";
  if (indicatorCount >= 1 || score > 45) return "MEDIUM";
  return "LOW";
}

// ============================================================
// VALIDATION UTILITIES
// ============================================================

export function isValidAmount(amount: number | null | undefined): boolean {
  return amount !== null && amount !== undefined && amount > 0;
}

export function isValidTransactionId(id: string): boolean {
  return id.trim().length > 0;
}

export function isValidReceiverType(
  type: string
): type is "individual" | "business" | "unknown" {
  return ["individual", "business", "unknown"].includes(type);
}
