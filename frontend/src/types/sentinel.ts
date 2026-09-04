export type DecisionType = 'APPROVE' | 'VERIFY' | 'BLOCK';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export interface UserContext {
  account_age_days: number;
  previous_transaction_count: number;
  usual_transaction_range: {
    min: number;
    max: number;
  };
}

export interface SharedTransaction {
  transaction_id: string;
  user_id: string;
  amount: number;
  currency: string;
  receiver_id: string;
  receiver_name?: string;
  receiver_type: string;
  timestamp: string;
  device_id: string;
  device_type: string;
  device_name?: string;
  location: LocationData;
  ip_address: string;
  user_context: UserContext;
  note?: string;
}

export interface RiskBreakdown {
  anomaly: number;      // 0 - 100 (weight 40%)
  velocity: number;     // 0 - 100 (weight 25%)
  receiver: number;     // 0 - 100 (weight 20%)
  behavioral: number;   // 0 - 100 (weight 15%)
}

export interface RiskAssessment {
  transaction_id: string;
  composite_score: number;
  decision: DecisionType;
  risk_level: RiskLevel;
  risk_breakdown: RiskBreakdown;
  reason_codes: string[];
  explanation: string;
  policy_applied: string;
  model_version: string;
  evaluated_at: string;
  latency_ms: number;
  signals: {
    behavioral_cadence: string;
    geo_hop_velocity: string;
    device_trust: string;
    typing_entropy: number;
    gyro_tilt: number;
    is_clipboard_paste: boolean;
    hardware_trust_score: number;
    human_probability: number;
  };
}

export interface SHAPFeature {
  name: string;
  category: string;
  impact_score: number; // e.g. -35 (safe) to +45 (risky)
  description: string;
  weight_percentage: number;
  raw_value: string;
  is_positive_risk: boolean;
}

export interface LatencyStep {
  step_number: number;
  name: string;
  category: string;
  latency_ms: number;
  sla_target_ms: number;
  description: string;
  status: 'passed' | 'warning' | 'breached';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  event_type: string;
  transaction_id: string;
  decision: DecisionType;
  risk_score: number;
  severity: 'NORMAL' | 'CAUTION' | 'CRITICAL';
  stage: string;
  details: string;
}

export interface Payee {
  id: string;
  name: string;
  vpa: string;
  category: string;
  initials: string;
  verified: boolean;
  defaultAmount: number;
  defaultNote: string;
  presetRisk: 'low' | 'medium' | 'high';
  receiver_type: string;
}
