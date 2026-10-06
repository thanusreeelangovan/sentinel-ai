import { 
  SharedTransaction, 
  RiskAssessment, 
  RiskBreakdown, 
  DecisionType, 
  RiskLevel,
  RiskExplanationFeature,
  LatencyStep,
  AuditLogEntry
} from '../types/sentinel';

/**
 * Calculates the exact Composite Risk Score based on the SentinelAI Technical Contract:
 * - Anomaly: 40%
 * - Velocity: 25%
 * - Receiver: 20%
 * - Behavior: 15%
 */
export function calculateRiskAssessment(
  tx: SharedTransaction,
  overrides?: Partial<RiskBreakdown>
): RiskAssessment {
  const startedAt = performance.now();
  // 1. Calculate base signals based on actual transaction attributes
  let anomalyScore = 8.5;
  let velocityScore = 12.0;
  let receiverScore = 5.0;
  let behavioralScore = 8.0;

  // Evaluate Receiver Risk from actual payload
  if (tx.receiver_id.includes('crypto') || tx.receiver_id.includes('shadow') || tx.receiver_type === 'unverified_p2p') {
    receiverScore = 95.0;
    anomalyScore += 45.0;
  } else if (tx.receiver_type === 'new_merchant') {
    receiverScore = 52.0;
    anomalyScore += 20.0;
  } else {
    receiverScore = 8.0;
  }

  // Evaluate Amount vs User Historical Range
  const { min, max } = tx.user_context?.usual_transaction_range || { min: 50, max: 5000 };
  const ratio = tx.amount / (max || 5000);

  if (ratio > 10) {
    anomalyScore += 48.0;
    velocityScore += 40.0;
  } else if (ratio > 3) {
    anomalyScore += 30.0;
    velocityScore += 20.0;
  } else if (ratio > 1) {
    anomalyScore += 15.0;
    velocityScore += 10.0;
  } else if (tx.amount < min * 0.5) {
    anomalyScore += 5.0;
  }

  // Evaluate Device & IP
  if (tx.device_type === 'android_emulator' || tx.device_id.includes('emu') || tx.device_id.includes('bot')) {
    anomalyScore += 35.0;
    behavioralScore = 92.0;
  } else if (tx.device_type === 'new_device') {
    anomalyScore += 18.0;
    behavioralScore += 20.0;
  }

  // Apply overrides if provided (for sandbox experimentation)
  const finalAnomaly = Math.min(100, Math.max(0, overrides?.anomaly ?? anomalyScore));
  const finalVelocity = Math.min(100, Math.max(0, overrides?.velocity ?? velocityScore));
  const finalReceiver = Math.min(100, Math.max(0, overrides?.receiver ?? receiverScore));
  const finalBehavioral = Math.min(100, Math.max(0, overrides?.behavioral ?? behavioralScore));

  // Compute composite score: 40% Anomaly + 25% Velocity + 20% Receiver + 15% Behavior
  const compositeScore = Math.round(
    ((finalAnomaly * 0.40) + (finalVelocity * 0.25) + (finalReceiver * 0.20) + (finalBehavioral * 0.15)) * 10
  ) / 10;

  // Determine Decision based on strict thresholds
  let decision: DecisionType = 'APPROVE';
  let riskLevel: RiskLevel = 'LOW';
  let policyApplied = 'POLICY_STANDARD_ALLOW_LIST_PASSED';

  if (compositeScore <= 40) {
    decision = 'APPROVE';
    riskLevel = 'LOW';
    policyApplied = 'POLICY_STANDARD_ALLOW_LIST_PASSED';
  } else if (compositeScore <= 75) {
    decision = 'VERIFY';
    riskLevel = 'MEDIUM';
    policyApplied = 'POLICY_STEP_UP_VERIFICATION_REQUIRED';
  } else {
    decision = 'BLOCK';
    riskLevel = 'HIGH';
    policyApplied = 'POLICY_HIGH_RISK_RECOMMENDATION_BLOCK';
  }

  // Generate reason codes directly tied to triggered rules
  const reasonCodes: string[] = [];
  if (finalAnomaly > 60) reasonCodes.push('HIGH_ANOMALY');
  if (finalVelocity > 60) reasonCodes.push('HIGH_TRANSACTION_VELOCITY');
  if (finalReceiver > 60) reasonCodes.push('SUSPICIOUS_RECEIVER');
  if (finalBehavioral > 60) reasonCodes.push('BEHAVIORAL_DEVIATION');
  if (ratio > 3) reasonCodes.push('UNUSUAL_AMOUNT_SURGE');
  if (tx.device_type === 'android_emulator') reasonCodes.push('EMULATOR_DEVICE_DETECTED');

  if (reasonCodes.length === 0 && riskLevel === 'LOW') {
    reasonCodes.push('LOW_RISK_BASELINE_CONFIRMED');
  }

  // Context-specific explanation
  let explanation = '';
  if (decision === 'APPROVE') {
    explanation = `The local demo engine recommends APPROVE for this ₹${tx.amount.toLocaleString('en-IN')} transaction to ${tx.receiver_name || tx.receiver_id} (${compositeScore}/100 low risk).`;
  } else if (decision === 'VERIFY') {
    explanation = `The local demo engine recommends VERIFY for this ₹${tx.amount.toLocaleString('en-IN')} transaction to ${tx.receiver_name || tx.receiver_id} (${compositeScore}/100 medium risk) due to ${reasonCodes.join(', ')}.`;
  } else {
    explanation = `The local demo engine recommends BLOCK for this high-risk transaction to ${tx.receiver_name || tx.receiver_id} (score: ${compositeScore}/100) due to ${reasonCodes.join(', ')}.`;
  }

  return {
    transaction_id: tx.transaction_id,
    composite_score: compositeScore,
    decision,
    risk_level: riskLevel,
    risk_breakdown: {
      anomaly: finalAnomaly,
      velocity: finalVelocity,
      receiver: finalReceiver,
      behavioral: finalBehavioral,
    },
    reason_codes: reasonCodes,
    explanation,
    policy_applied: policyApplied,
    model_version: 'local-demo-rules',
    evaluated_at: new Date().toISOString(),
    latency_ms: Math.max(1, Math.round(performance.now() - startedAt)),
    evaluation_source: 'LOCAL DEMO ENGINE',
    model_explanation_method: 'LOCAL_HEURISTIC',
    model_feature_contributions: [],
    signals: {
      behavioral_cadence: finalBehavioral > 40 ? 'RULE_SCORE_ELEVATED' : 'RULE_SCORE_NOT_ELEVATED',
      geo_hop_velocity: 'NOT_COLLECTED',
      device_trust: tx.device_type === 'android_emulator' ? 'SUBMITTED_EMULATOR_TYPE' : tx.device_type === 'new_device' ? 'SUBMITTED_NEW_DEVICE_TYPE' : 'DEVICE_TYPE_UNVERIFIED',
      typing_entropy: 0,
      gyro_tilt: 0,
      is_clipboard_paste: false,
      hardware_trust_score: 0,
      human_probability: 0,
    }
  };
}

/**
 * Return backend model contributions, or clearly labelled local component heuristics.
 */
export function generateRiskExplanationFeatures(
  assessment: RiskAssessment,
  tx: SharedTransaction
): RiskExplanationFeature[] {
  if (assessment.evaluation_source === 'FASTAPI BACKEND') {
    return assessment.model_feature_contributions.map((item) => ({
      name: item.feature_name,
      category: 'ISOLATION FOREST ANOMALY',
      description: `Isolation Forest anomaly-model contribution for the extracted feature "${item.feature_name}".`,
      weight_percentage: 40,
      raw_value: String(item.feature_value),
      model_contribution: item.model_contribution,
    }));
  }

  const maxAllowed = tx.user_context?.usual_transaction_range?.max || 5000;
  const components: Array<{
    name: string;
    category: string;
    value: number;
    weight: number;
    description: string;
  }> = [
    {
      name: 'Anomaly score',
      category: 'ANOMALY',
      value: assessment.risk_breakdown.anomaly,
      weight: 40,
      description: `Local demo heuristic compared this transaction with the supplied amount range (upper bound ₹${maxAllowed.toLocaleString('en-IN')}) and device context.`,
    },
    {
      name: 'Velocity risk',
      category: 'VELOCITY',
      value: assessment.risk_breakdown.velocity,
      weight: 25,
      description: 'Rule-based local demo signal; no backend evaluation was available.',
    },
    {
      name: 'Receiver risk',
      category: 'RECEIVER',
      value: assessment.risk_breakdown.receiver,
      weight: 20,
      description: `Local demo receiver signal for ${tx.receiver_name || tx.receiver_id}; an unfamiliar receiver alone does not determine the transaction outcome.`,
    },
    {
      name: 'Behavioral risk',
      category: 'BEHAVIORAL',
      value: assessment.risk_breakdown.behavioral,
      weight: 15,
      description: 'Rule-based local demo signal from the available transaction context, not biometric measurement.',
    },
  ];

  return components.map((component) => ({
    name: component.name,
    category: component.category,
    description: component.description,
    weight_percentage: component.weight,
    raw_value: `${component.value}/100`,
    risk_score: component.value,
  }));
}

/** Return the one evaluation-duration measurement available for the selected source. */
export function getLatencyBreakdown(
  totalLatencyMs: number,
  evaluationSource: RiskAssessment['evaluation_source']
): LatencyStep[] {
  return [
    {
      step_number: 1,
      name: 'End-to-end risk evaluation',
      category: evaluationSource,
      latency_ms: totalLatencyMs,
      description: evaluationSource === 'FASTAPI BACKEND'
        ? 'Measured backend evaluation duration returned by FastAPI; no stage-level or external network SLA is claimed.'
        : 'Local deterministic demo calculation duration; this is not a backend measurement.',
      status: 'measured'
    }
  ];
}

/** Build client-side illustrative activity; durable audit records are written by the backend. */
export function generateAuditLogs(assessment: RiskAssessment, tx: SharedTransaction): AuditLogEntry[] {
  const baseTime = new Date();
  const formatTime = (offsetMs: number) => {
    const d = new Date(baseTime.getTime() - offsetMs);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  const isHigh = assessment.composite_score > 75;
  const isMed = assessment.composite_score > 40 && assessment.composite_score <= 75;

  return [
    {
      id: 'LOG_' + Math.random().toString(36).substr(2, 9),
      timestamp: formatTime(0),
      event_type: 'PROCESS_COMPLETED',
      transaction_id: tx.transaction_id,
      decision: assessment.decision,
      risk_score: assessment.composite_score,
      severity: isHigh ? 'CRITICAL' : isMed ? 'CAUTION' : 'NORMAL',
      stage: `COMPLETED (+${assessment.latency_ms}ms)`,
      details: `Evaluation finalized in ${assessment.latency_ms}ms. Decision: ${assessment.decision} (Composite Score: ${assessment.composite_score}/100). Model: ${assessment.model_version}.`
    },
    {
      id: 'LOG_' + Math.random().toString(36).substr(2, 9),
      timestamp: formatTime(3),
      event_type: 'DECISION_ENGINE_EVALUATION',
      transaction_id: tx.transaction_id,
      decision: assessment.decision,
      risk_score: assessment.composite_score,
      severity: isHigh ? 'CRITICAL' : isMed ? 'CAUTION' : 'NORMAL',
      stage: 'DECISION_ENGINE',
      details: `Policy applied: ${assessment.policy_applied}. Triggered Reason Codes: [${assessment.reason_codes.join(', ')}].`
    },
    {
      id: 'LOG_' + Math.random().toString(36).substr(2, 9),
      timestamp: formatTime(6),
      event_type: 'RISK_SCORING_AGGREGATION',
      transaction_id: tx.transaction_id,
      decision: assessment.decision,
      risk_score: assessment.composite_score,
      severity: isHigh ? 'CRITICAL' : isMed ? 'CAUTION' : 'NORMAL',
      stage: 'RISK_SCORING (+36ms)',
      details: `Normalized breakdown: Anomaly=${assessment.risk_breakdown.anomaly}, Velocity=${assessment.risk_breakdown.velocity}, Receiver=${assessment.risk_breakdown.receiver}, Behavioral=${assessment.risk_breakdown.behavioral}.`
    },
    {
      id: 'LOG_' + Math.random().toString(36).substr(2, 9),
      timestamp: formatTime(15),
      event_type: 'ANOMALY_MODEL_INFERENCE',
      transaction_id: tx.transaction_id,
      decision: assessment.decision,
      risk_score: assessment.composite_score,
      severity: isHigh ? 'CRITICAL' : isMed ? 'CAUTION' : 'NORMAL',
      stage: 'ANOMALY_DETECTION (+24ms)',
      details: `Evaluated ₹${tx.amount} vs baseline max ₹${tx.user_context?.usual_transaction_range?.max || 5000}. Target VPA: ${tx.receiver_id}.`
    },
    {
      id: 'LOG_' + Math.random().toString(36).substr(2, 9),
      timestamp: formatTime(41),
      event_type: 'TRANSACTION_INTERCEPTED',
      transaction_id: tx.transaction_id,
      decision: assessment.decision,
      risk_score: assessment.composite_score,
      severity: 'NORMAL',
      stage: 'INGRESS (0ms)',
      details: `Intercepted pre-authorization packet: ₹${tx.amount} to ${tx.receiver_name || tx.receiver_id} [VPA: ${tx.receiver_id}, Device: ${tx.device_id}]`
    }
  ];
}
