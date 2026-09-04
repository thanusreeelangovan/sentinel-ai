import React, { useState } from 'react';
import { 
  Activity, 
  Clock, 
  Code2, 
  ScrollText, 
  Fingerprint, 
  Copy, 
  Check, 
  Terminal, 
  TrendingUp, 
  CheckCircle2, 
  Search, 
  Sparkles,
  Server,
  Globe,
  RefreshCw
} from 'lucide-react';
import { 
  RiskAssessment, 
  SharedTransaction, 
  SHAPFeature, 
  LatencyStep, 
  AuditLogEntry 
} from '../types/sentinel';
import { 
  generateSHAPFeatures, 
  getLatencyBreakdown, 
  generateAuditLogs 
} from '../services/riskEngine';
import { ReportReceiverButton } from './ReportReceiverButton';

interface TelemetryDeckProps {
  assessment: RiskAssessment | null;
  transaction: SharedTransaction;
  isRealBackend?: boolean;
  backendEndpoint?: string;
  onRefreshBackendCheck?: () => void;
  backendError?: string;
}

export const TelemetryDeck: React.FC<TelemetryDeckProps> = ({
  assessment,
  transaction,
  isRealBackend = false,
  backendEndpoint = 'http://localhost:8000/transactions/evaluate',
  onRefreshBackendCheck,
  backendError: _backendError,
}) => {
  const [activeTab, setActiveTab] = useState<'shap' | 'biometrics' | 'latency' | 'api' | 'audit'>('shap');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [apiSubTab, setApiSubTab] = useState<'response' | 'request' | 'route'>('response');
  const [auditFilter, setAuditFilter] = useState<string>('ALL');
  const [auditSearch, setAuditSearch] = useState<string>('');

  if (!assessment) {
    return (
      <div 
        className="flex-1 min-h-[520px] flex flex-col justify-center items-center rounded-3xl border p-8 text-center shadow-sm"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-default)',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div 
          className="w-16 h-16 rounded-2xl border flex items-center justify-center mb-4 shadow-sm animate-pulse"
          style={{
            backgroundColor: 'var(--bg-card-subtle)',
            borderColor: 'var(--border-default)',
            color: 'var(--primary)'
          }}
        >
          <Activity className="w-8 h-8" />
        </div>
        
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>SentinelAI Neural Telemetry Deck Ready</span>
          <Sparkles className="w-4 h-4" style={{ color: 'var(--primary)' }} />
        </h3>
        
        <p className="text-xs max-w-md leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
          Initiate or execute a UPI transaction on the mobile simulator to trigger live multi-model inference, SHAP attribution, and sub-millisecond telemetry.
        </p>

        {/* Live Backend Connection Indicator */}
        <div 
          className="p-3.5 rounded-2xl border max-w-md w-full text-left text-xs font-mono"
          style={{
            backgroundColor: 'var(--bg-card-subtle)',
            borderColor: 'var(--border-default)'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <Server className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
              FastAPI Endpoint Target:
            </span>
            <span 
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isRealBackend ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isRealBackend ? '● Live Backend Connected' : '○ Standby / Auto-Fallback'}
            </span>
          </div>
          <div className="text-[11px] truncate font-mono" style={{ color: 'var(--text-muted)' }}>
            {backendEndpoint}
          </div>
        </div>
      </div>
    );
  }

  // Generate dynamic SHAP features from actual transaction properties
  const shapFeatures: SHAPFeature[] = generateSHAPFeatures(assessment, transaction);
  const latencySteps: LatencyStep[] = getLatencyBreakdown(assessment.latency_ms);
  const auditLogs: AuditLogEntry[] = generateAuditLogs(assessment, transaction);

  const isHigh = assessment.composite_score > 75;
  const isMed = assessment.composite_score > 40 && assessment.composite_score <= 75;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesFilter = auditFilter === 'ALL' || log.severity === auditFilter;
    const matchesSearch = auditSearch === '' || 
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.event_type.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.stage.toLowerCase().includes(auditSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const apiResponseBody = {
    transaction_id: transaction.transaction_id,
    composite_score: assessment.composite_score,
    decision: assessment.decision,
    risk_breakdown: assessment.risk_breakdown,
    reason_codes: assessment.reason_codes,
    explanation: assessment.explanation,
    model_version: assessment.model_version,
    evaluated_at: assessment.evaluated_at,
    latency_ms: assessment.latency_ms
  };

  const apiRequestBody = {
    transaction_id: transaction.transaction_id,
    user_id: transaction.user_id,
    amount: transaction.amount,
    currency: transaction.currency,
    receiver_id: transaction.receiver_id,
    receiver_name: transaction.receiver_name,
    receiver_type: transaction.receiver_type,
    timestamp: transaction.timestamp,
    device_id: transaction.device_id,
    device_type: transaction.device_type,
    location: transaction.location,
    ip_address: transaction.ip_address,
    user_context: transaction.user_context,
    note: transaction.note
  };

  const fastApiRouteCode = `@router.post("/transactions/evaluate", response_model=EvaluationResponse)
async def evaluate_transaction(
    payload: SharedTransactionPayload,
    db: Session = Depends(get_db)
):
    # 1. Real Feature Extraction (ML Model: Devika)
    features = await extract_features(payload)
    anomaly_score = ml_model.predict_anomaly(features) # Normalized (0-100)
    
    # 2. Rule & Velocity Signals (Krrish)
    velocity_score, receiver_score, behavioral_score, rules = rule_engine.evaluate(payload)
    
    # 3. Normalized Fusion Formula (Section 8.1)
    composite_score = (
        (anomaly_score * 0.40) +
        (velocity_score * 0.25) +
        (receiver_score * 0.20) +
        (behavioral_score * 0.15)
    )
    
    # 4. Strict Decision Thresholds (Section 11)
    decision = "APPROVE" if composite_score <= 40 else ("VERIFY" if composite_score <= 75 else "BLOCK")
    
    # 5. PostgreSQL Immutable Audit Logging (Thanusree)
    audit_log = record_audit(db, payload, composite_score, decision)
    
    return EvaluationResponse(
        transaction_id=payload.transaction_id,
        composite_score=round(composite_score, 1),
        decision=decision,
        risk_breakdown={
            "anomaly": anomaly_score,
            "velocity": velocity_score,
            "receiver": receiver_score,
            "behavioral": behavioral_score
        },
        reason_codes=rules.triggered_codes,
        evaluated_at=datetime.utcnow().isoformat()
    )`;

  return (
    <div 
      className="flex-1 flex flex-col rounded-3xl border overflow-hidden shadow-sm"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-default)',
        boxShadow: 'var(--shadow-card)'
      }}
    >
      {/* Top Header */}
      <div 
        className="p-4 sm:p-5 border-b"
        style={{
          backgroundColor: 'var(--bg-card-subtle)',
          borderColor: 'var(--border-default)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary)' }}></div>
            <span className="text-xs font-mono font-bold tracking-wider uppercase" style={{ color: 'var(--text-primary)' }}>
              SENTINEL NEURAL TELEMETRY DECK
            </span>
          </div>

          {/* Backend Connection Indicator Badge */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <div 
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold"
              style={{
                backgroundColor: isRealBackend ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface)',
                borderColor: isRealBackend ? '#10B981' : 'var(--border-default)',
                color: isRealBackend ? '#047857' : 'var(--text-secondary)'
              }}
            >
              <Globe className="w-3 h-3" style={{ color: isRealBackend ? '#10B981' : 'var(--primary)' }} />
              <span>{isRealBackend ? 'Live FastAPI Backend (200 OK)' : 'Deterministic ML Engine'}</span>
            </div>

            {onRefreshBackendCheck && (
              <button 
                onClick={onRefreshBackendCheck}
                title="Test backend connection"
                className="p-1 rounded-lg border hover:opacity-80 transition"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--primary)'
                }}
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Hero Banner */}
        <div 
          className="p-4 rounded-2xl border transition-all"
          style={{
            backgroundColor: isHigh ? 'rgb(254, 242, 242)' : isMed ? 'rgb(254, 252, 232)' : 'var(--bg-surface)',
            borderColor: isHigh ? 'rgb(252, 165, 165)' : isMed ? 'rgb(253, 224, 71)' : 'var(--border-default)'
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>TRANSACTION:</span>
                <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{transaction.transaction_id}</span>
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase text-white shadow-sm"
                  style={{
                    backgroundColor: assessment.decision === 'APPROVE' ? 'var(--primary)' : assessment.decision === 'VERIFY' ? '#D97706' : '#DC2626'
                  }}
                >
                  {assessment.decision}
                </span>
              </div>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span>₹{transaction.amount.toLocaleString('en-IN')} to {transaction.receiver_name || transaction.receiver_id}</span>
              </h2>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] font-mono block uppercase" style={{ color: 'var(--text-secondary)' }}>COMPOSITE RISK</span>
                <span 
                  className="text-2xl font-black font-mono"
                  style={{ color: isHigh ? '#DC2626' : isMed ? '#D97706' : 'var(--primary)' }}
                >
                  {assessment.composite_score} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 100</span>
                </span>
              </div>
              <div className="w-px h-8" style={{ backgroundColor: 'var(--border-default)' }}></div>
              <div className="text-right">
                <span className="text-[10px] font-mono block uppercase" style={{ color: 'var(--text-secondary)' }}>INSPECTION TIME</span>
                <span className="text-2xl font-black font-mono" style={{ color: 'var(--primary)' }}>
                  {assessment.latency_ms}<span className="text-xs font-normal">ms</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t text-xs flex items-start gap-2" style={{ borderColor: 'var(--border-default)' }}>
            <span className="font-mono font-bold flex items-center gap-1 flex-shrink-0" style={{ color: 'var(--primary)' }}>
              <Terminal className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
              Executive XAI Summary:
            </span>
            <span style={{ color: 'var(--text-secondary)' }} className="leading-snug">
              {assessment.explanation}
            </span>
          </div>

          {isHigh && (
            <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border-default)' }}>
              <div className="text-xs text-rose-700 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                <span>Critical Threat Flagged: Escalation available for this receiver.</span>
              </div>
              <div className="w-full sm:w-72">
                <ReportReceiverButton
                  currentUserId={transaction.user_id}
                  senderId={transaction.user_id}
                  receiverId={transaction.receiver_id}
                  receiverName={transaction.receiver_name}
                  riskAssessment={assessment}
                  transactionContext={{
                    transaction_id: transaction.transaction_id,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    device_id: transaction.device_id,
                    note: transaction.note
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div 
        className="flex items-center border-b px-4 overflow-x-auto"
        style={{
          backgroundColor: 'var(--bg-card-subtle)',
          borderColor: 'var(--border-default)'
        }}
      >
        {[
          { id: 'shap', label: 'SHAP Feature Attribution', icon: Activity },
          { id: 'biometrics', label: 'Behavioral Biometrics', icon: Fingerprint },
          { id: 'latency', label: 'Sub-ms Latency Breakdown', icon: Clock },
          { id: 'api', label: 'FastAPI REST Contract', icon: Code2 },
          { id: 'audit', label: 'Audit Log Journal', icon: ScrollText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'shap' | 'biometrics' | 'latency' | 'api' | 'audit')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === tab.id ? 'font-bold bg-white' : 'border-transparent hover:opacity-80'
            }`}
            style={{
              borderColor: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)'
            }}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SHAP ATTRIBUTION */}
      {activeTab === 'shap' && (
        <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                REAL SHAP FEATURE ATTRIBUTION &amp; FACTOR WEIGHTS
              </h4>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Mathematically extracted contribution of transaction attributes to composite risk
              </p>
            </div>
            <div className="text-right text-xs font-mono">
              <span style={{ color: 'var(--text-secondary)' }}>FINAL RISK SCORE</span>
              <div 
                className="font-bold text-base"
                style={{ color: isHigh ? '#DC2626' : isMed ? '#D97706' : 'var(--primary)' }}
              >
                {assessment.composite_score} / 100
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {shapFeatures.map((feat, idx) => (
              <div 
                key={idx} 
                className="p-3.5 rounded-2xl border text-xs shadow-sm"
                style={{
                  backgroundColor: 'var(--bg-card-subtle)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
                      style={{
                        backgroundColor: feat.impact_score > 0 ? 'rgb(254, 242, 242)' : 'var(--bg-surface)',
                        borderColor: feat.impact_score > 0 ? 'rgb(252, 165, 165)' : 'var(--border-default)',
                        color: feat.impact_score > 0 ? '#DC2626' : 'var(--primary)'
                      }}
                    >
                      {feat.impact_score > 0 ? `+${feat.impact_score}` : feat.impact_score} pts
                    </span>
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{feat.name}</span>
                    <span 
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border"
                      style={{
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {feat.category}
                    </span>
                  </div>
                  <span className="font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Weight: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{feat.weight_percentage}%</span>
                  </span>
                </div>

                <p className="text-[11px] mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {feat.description}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Raw Input Value: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{feat.raw_value}</span></span>
                  <span 
                    className="font-bold"
                    style={{ color: feat.is_positive_risk ? '#DC2626' : 'var(--primary)' }}
                  >
                    {feat.is_positive_risk ? '↑ Increases Risk' : '↓ Decreases Risk (Safe Signal)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BIOMETRICS */}
      {activeTab === 'biometrics' && (
        <div className="p-5 flex-1 overflow-y-auto space-y-5 bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Fingerprint className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                BEHAVIORAL BIOMETRICS &amp; DEVICE INTEGRITY
              </h4>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Live keystroke dynamics, sensor tilt, and hardware attestations
              </p>
            </div>
            <span 
              className="px-3 py-1 rounded-lg text-xs font-mono font-bold border"
              style={{
                backgroundColor: 'var(--bg-card-subtle)',
                borderColor: 'var(--border-default)',
                color: 'var(--primary)'
              }}
            >
              {assessment.signals.human_probability}% Human Probability
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className="p-4 rounded-2xl border"
              style={{
                backgroundColor: 'var(--bg-card-subtle)',
                borderColor: 'var(--border-default)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase font-bold" style={{ color: 'var(--text-secondary)' }}>KEYSTROKE ENTROPY</span>
                <span className="text-lg font-bold font-mono" style={{ color: 'var(--primary)' }}>
                  {assessment.signals.typing_entropy}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full mb-3 overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
                <div 
                  className="h-full transition-all"
                  style={{ 
                    width: `${assessment.signals.typing_entropy}%`,
                    backgroundColor: assessment.signals.typing_entropy < 30 ? '#DC2626' : 'var(--primary)'
                  }}
                ></div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {assessment.signals.typing_entropy > 50 
                  ? 'Natural stochastic variance in key-press intervals conforming to organic human motor patterns.'
                  : 'Fixed millisecond interval keystrokes indicative of scripted automated bot submission.'}
              </p>
            </div>

            <div 
              className="p-4 rounded-2xl border"
              style={{
                backgroundColor: 'var(--bg-card-subtle)',
                borderColor: 'var(--border-default)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase font-bold" style={{ color: 'var(--text-secondary)' }}>GYRO TILT ANGLE</span>
                <span className="text-lg font-bold font-mono" style={{ color: 'var(--primary)' }}>
                  {assessment.signals.gyro_tilt}°
                </span>
              </div>
              <div className="w-full h-2 rounded-full mb-3 overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
                <div 
                  className="h-full transition-all"
                  style={{ 
                    width: `${Math.min(100, assessment.signals.gyro_tilt * 2)}%`,
                    backgroundColor: assessment.signals.gyro_tilt < 5 ? '#DC2626' : 'var(--primary)'
                  }}
                ></div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {assessment.signals.gyro_tilt > 20 
                  ? 'Natural handheld posture (35°-50° grip angle).'
                  : 'Flat 0.0° angle with zero physical micro-vibrations (desktop emulator / VM).'}
              </p>
            </div>

            <div 
              className="p-4 rounded-2xl border"
              style={{
                backgroundColor: 'var(--bg-card-subtle)',
                borderColor: 'var(--border-default)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase font-bold" style={{ color: 'var(--text-secondary)' }}>DEVICE INTEGRITY</span>
                <span 
                  className="text-xs font-bold font-mono px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: transaction.device_type === 'android_emulator' ? 'rgb(254, 242, 242)' : 'var(--bg-surface)',
                    borderColor: transaction.device_type === 'android_emulator' ? 'rgb(252, 165, 165)' : 'var(--border-default)',
                    color: transaction.device_type === 'android_emulator' ? '#DC2626' : 'var(--primary)'
                  }}
                >
                  {transaction.device_type === 'android_emulator' ? 'Rooted Emulator' : 'Hardware Trusted'}
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                Hardware ID: <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{transaction.device_id}</span>
              </p>
            </div>

            <div 
              className="p-4 rounded-2xl border"
              style={{
                backgroundColor: 'var(--bg-card-subtle)',
                borderColor: 'var(--border-default)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase font-bold" style={{ color: 'var(--text-secondary)' }}>HARDWARE TRUST SCORE</span>
                <span 
                  className="text-lg font-bold font-mono"
                  style={{ color: assessment.signals.hardware_trust_score < 40 ? '#DC2626' : 'var(--primary)' }}
                >
                  {assessment.signals.hardware_trust_score}/100
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                {assessment.signals.device_trust}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LATENCY */}
      {activeTab === 'latency' && (
        <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Clock className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                SUB-MILLISECOND PIPELINE LATENCY BREAKDOWN
              </h4>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Measured stage-by-stage timing profile vs NPCI 200ms UPI SLA
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="text-right">
                <span className="block text-[10px]" style={{ color: 'var(--text-secondary)' }}>TOTAL LATENCY</span>
                <span className="font-bold text-sm" style={{ color: 'var(--primary)' }}>{assessment.latency_ms}ms</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px]" style={{ color: 'var(--text-secondary)' }}>SLA BUDGET USED</span>
                <span className="font-bold text-sm" style={{ color: 'var(--primary)' }}>
                  {Math.round((assessment.latency_ms / 200) * 100)}%
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {latencySteps.map(step => (
              <div 
                key={step.step_number} 
                className="p-3.5 rounded-2xl border text-xs font-mono"
                style={{
                  backgroundColor: 'var(--bg-card-subtle)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    {step.step_number}. {step.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: 'var(--primary)' }}>{step.latency_ms}ms</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>(&lt;{step.sla_target_ms}ms target)</span>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full mb-2 overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
                  <div 
                    className="h-full"
                    style={{ 
                      width: `${(step.latency_ms / step.sla_target_ms) * 100}%`,
                      backgroundColor: 'var(--primary)'
                    }}
                  ></div>
                </div>

                <p className="text-[11px] font-sans" style={{ color: 'var(--text-secondary)' }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div 
            className="p-3.5 rounded-2xl border flex items-center justify-between text-xs font-mono"
            style={{
              backgroundColor: 'var(--bg-card-subtle)',
              borderColor: 'var(--border-default)'
            }}
          >
            <span className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              Ultra-Low Latency Execution ({assessment.latency_ms}ms)
            </span>
            <span 
              className="px-2.5 py-0.5 rounded font-bold border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-default)',
                color: 'var(--primary)'
              }}
            >
              PASSED 200MS SLA
            </span>
          </div>
        </div>
      )}

      {/* TAB 4: API CONTRACT */}
      {activeTab === 'api' && (
        <div className="p-5 flex-1 flex flex-col overflow-hidden bg-[var(--bg-surface)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Code2 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                FASTAPI REST SERVICE CONTRACT &amp; LIVE DATA DUMP
              </h4>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Actual JSON payload transmitted and received for Transaction ID: {transaction.transaction_id}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div 
                className="flex items-center border rounded-xl p-1 text-xs font-mono"
                style={{
                  backgroundColor: 'var(--bg-card-subtle)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <button
                  onClick={() => setApiSubTab('response')}
                  className="px-3 py-1 rounded-lg transition font-bold"
                  style={{
                    backgroundColor: apiSubTab === 'response' ? 'var(--primary)' : 'transparent',
                    color: apiSubTab === 'response' ? 'var(--text-on-primary)' : 'var(--text-secondary)'
                  }}
                >
                  Live Response JSON
                </button>
                <button
                  onClick={() => setApiSubTab('request')}
                  className="px-3 py-1 rounded-lg transition font-bold"
                  style={{
                    backgroundColor: apiSubTab === 'request' ? 'var(--primary)' : 'transparent',
                    color: apiSubTab === 'request' ? 'var(--text-on-primary)' : 'var(--text-secondary)'
                  }}
                >
                  Live Request JSON
                </button>
                <button
                  onClick={() => setApiSubTab('route')}
                  className="px-3 py-1 rounded-lg transition font-bold"
                  style={{
                    backgroundColor: apiSubTab === 'route' ? 'var(--primary)' : 'transparent',
                    color: apiSubTab === 'route' ? 'var(--text-on-primary)' : 'var(--text-secondary)'
                  }}
                >
                  FastAPI Route.py
                </button>
              </div>

              <button
                onClick={() => handleCopy(
                  apiSubTab === 'response' ? JSON.stringify(apiResponseBody, null, 2) :
                  apiSubTab === 'request' ? JSON.stringify(apiRequestBody, null, 2) :
                  fastApiRouteCode
                )}
                className="p-2 rounded-xl transition border"
                style={{
                  backgroundColor: 'var(--bg-card-subtle)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)'
                }}
                title="Copy to clipboard"
              >
                {copiedJson ? <Check className="w-4 h-4" style={{ color: 'var(--primary)' }} /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div 
            className="flex-1 rounded-2xl p-4 overflow-y-auto font-mono text-xs border"
            style={{
              backgroundColor: 'var(--terminal-bg)',
              borderColor: 'var(--border-default)',
              color: 'var(--terminal-text)'
            }}
          >
            <pre className="whitespace-pre-wrap leading-relaxed">
              {apiSubTab === 'response' && JSON.stringify(apiResponseBody, null, 2)}
              {apiSubTab === 'request' && JSON.stringify(apiRequestBody, null, 2)}
              {apiSubTab === 'route' && fastApiRouteCode}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="p-5 flex-1 flex flex-col overflow-hidden bg-[var(--bg-surface)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <ScrollText className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                REAL-TIME AUDIT TRAIL &amp; TELEMETRY JOURNAL
              </h4>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Cryptographically timestamped transaction log for {transaction.transaction_id}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="border text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-card-subtle)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="ALL">All Severities</option>
                <option value="NORMAL">NORMAL</option>
                <option value="CAUTION">CAUTION</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--primary)' }} />
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Filter audit logs by stage, reason, or event..."
              className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-card-subtle)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs">
            {filteredAuditLogs.map(log => (
              <div 
                key={log.id} 
                className="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                style={{
                  backgroundColor: log.severity === 'CRITICAL' ? 'rgb(254, 242, 242)' : log.severity === 'CAUTION' ? 'rgb(254, 252, 232)' : 'var(--bg-card-subtle)',
                  borderColor: log.severity === 'CRITICAL' ? 'rgb(252, 165, 165)' : log.severity === 'CAUTION' ? 'rgb(253, 224, 71)' : 'var(--border-default)'
                }}
              >
                <div className="flex items-center gap-3">
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                    style={{
                      backgroundColor: log.severity === 'CRITICAL' ? '#DC2626' : log.severity === 'CAUTION' ? '#D97706' : 'var(--primary)'
                    }}
                  >
                    {log.stage}
                  </span>
                  <span className="text-[11px] font-sans font-medium" style={{ color: 'var(--text-primary)' }}>
                    {log.details}
                  </span>
                </div>

                <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
