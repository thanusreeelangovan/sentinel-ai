// ============================================================
// TRANSACTION TYPES
// ============================================================

export interface Transaction {
  transaction_id: string;
  user_id: string;
  sender_id?: string;
  receiver_id: string;
  receiver_type?: "individual" | "business" | "unknown";
  amount: number;
  currency: string;
  timestamp: string;
  device_id?: string;
  device_type?: string;
  location?: string;
  ip_address?: string;
  user_context?: Record<string, unknown>;
}

// ============================================================
// RISK BREAKDOWN
// ============================================================

export interface RiskBreakdown {
  anomaly: number;
  velocity: number;
  receiver: number;
  behavioral: number;
}

// ============================================================
// EVALUATION RESPONSE
// ============================================================

export interface EvaluationResponse {
  transaction_id: string;
  composite_score: number;
  decision: "APPROVE" | "VERIFY" | "BLOCK";
  risk_breakdown: RiskBreakdown;
  reason_codes: string[];
  // Optional fields when backend adds them
  salami_attack_detected?: boolean;
  salami_indicators?: string[];
  salami_risk_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  cumulative_suspicious_amount?: number;
  explanation?: string;
  detected_at?: string;
}

// ============================================================
// TRANSACTION DETAIL
// ============================================================

export interface TransactionDetail extends Transaction {
  composite_score: number;
  decision: "APPROVE" | "VERIFY" | "BLOCK";
  risk_breakdown: RiskBreakdown;
  reason_codes: string[];
  status: "pending" | "processing" | "completed" | "failed";
  salami_attack_detected?: boolean;
  salami_indicators?: string[];
  salami_risk_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  cumulative_suspicious_amount?: number;
  explanation?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// DASHBOARD DATA
// ============================================================

export interface DashboardSummary {
  total_transactions: number;
  approved_transactions: number;
  verified_transactions: number;
  blocked_transactions: number;
  high_risk_transactions: number;
  salami_attack_alerts: number;
  amount_protected: number;
  cumulative_suspicious_amount: number;
  verification_required_count: number;
}

export interface RiskDistribution {
  low_risk: number;
  medium_risk: number;
  high_risk: number;
}

// ============================================================
// MONITORING & ALERTS
// ============================================================

export interface SalamiAttackAlert {
  transaction_id: string;
  user_id: string;
  amount: number;
  composite_score: number;
  salami_risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  detection_reason: string;
  decision: "APPROVE" | "VERIFY" | "BLOCK";
  detected_at: string;
  indicators: string[];
}

// ============================================================
// PROCESSING STATE
// ============================================================

export type ProcessingStep =
  | "received"
  | "intercepted"
  | "behavioral_analysis"
  | "salami_detection"
  | "risk_calculation"
  | "decision_engine"
  | "completed";

export interface ProcessingState {
  step: ProcessingStep;
  progress: number;
  message: string;
  timestamp: string;
}
