import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Server, ShieldAlert } from 'lucide-react';
import { RiskAssessment, SharedTransaction } from '../types/sentinel';

interface RiskInspectorProps {
  assessment: RiskAssessment | null;
  transaction: SharedTransaction;
  isRealBackend: boolean;
  backendError?: string | null;
}

const reasonLabel = (code: string): string => {
  const labels: Record<string, string> = {
    ACCOUNT_TAKEOVER_SUSPECTED: 'Account takeover pattern detected',
    HIGH_ANOMALY: 'Unusual transaction pattern',
    HIGH_TRANSACTION_VELOCITY: 'Transaction velocity is elevated',
    NEW_RECEIVER: 'New or limited-history receiver',
    UNKNOWN_RECEIVER_TYPE: 'Unrecognized receiver category',
    UNUSUAL_AMOUNT: 'Amount differs from the usual range',
    NEW_DEVICE: 'New or unfamiliar device',
    NEW_LOCATION: 'New location',
    UNUSUAL_HOUR: 'Unusual payment time',
    SUSPICIOUS_RECEIVER: 'Receiver risk is elevated',
    BEHAVIORAL_DEVIATION: 'Behaviour differs from recent activity',
    UNUSUAL_AMOUNT_SURGE: 'Amount is much higher than usual',
    EMULATOR_DEVICE_DETECTED: 'Emulator-like device context',
  };
  return labels[code] || code.split('_').join(' ').toLowerCase();
};

export const RiskInspector: React.FC<RiskInspectorProps> = ({
  assessment,
  transaction,
  isRealBackend,
  backendError,
}) => {
  const tone = !assessment
    ? 'text-zinc-300 border-zinc-700 bg-zinc-950/70'
    : assessment.risk_level === 'LOW'
      ? 'text-emerald-300 border-emerald-700/60 bg-emerald-950/20'
      : assessment.risk_level === 'MEDIUM'
        ? 'text-amber-300 border-amber-700/60 bg-amber-950/20'
        : 'text-red-300 border-red-700/60 bg-red-950/20';

  const Icon = !assessment
    ? Activity
    : assessment.risk_level === 'LOW'
      ? CheckCircle2
      : assessment.risk_level === 'MEDIUM'
        ? AlertTriangle
        : ShieldAlert;

  return (
    <section className="w-full lg:w-[430px] rounded-3xl border border-zinc-800 bg-zinc-950/75 shadow-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-zinc-500 font-mono">SentinelAI</p>
          <h2 className="text-sm font-bold text-white">Pre-authorization inspection</h2>
        </div>
        <div className={`text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
          isRealBackend
            ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300'
            : 'border-amber-700/60 bg-amber-950/40 text-amber-300'
        }`}>
          <Server className="w-3 h-3" />
          {isRealBackend ? 'FastAPI' : 'Local fallback'}
        </div>
      </div>

      {!assessment ? (
        <div className="p-5 space-y-4">
          <div className={`rounded-2xl border p-4 ${tone}`}>
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5" />
              <div>
                <p className="text-sm font-semibold">Ready for a payment</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Use the UPI app normally. Risk appears here only after payment authorization begins.
                </p>
              </div>
            </div>
          </div>
          {backendError && (
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Backend check: {backendError}. The consumer flow remains usable with the clearly separated local demo engine.
            </p>
          )}
        </div>
      ) : (
        <div className="p-5 space-y-5">
          <div className={`rounded-2xl border p-4 ${tone}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider opacity-70">Decision</p>
                  <p className="text-xl font-black">{assessment.decision}</p>
                  <p className="text-xs opacity-80 truncate mt-1">
                    ₹{transaction.amount.toLocaleString('en-IN')} → {transaction.receiver_name || transaction.receiver_id}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider opacity-70">Risk</p>
                <p className="text-2xl font-black font-mono">{assessment.composite_score}</p>
                <p className="text-[10px] opacity-70">/100</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Score composition</p>
            <div className="space-y-3">
              {[
                ['Anomaly', assessment.risk_breakdown.anomaly],
                ['Velocity', assessment.risk_breakdown.velocity],
                ['Receiver', assessment.risk_breakdown.receiver],
                ['Behavioural', assessment.risk_breakdown.behavioral],
              ].map(([label, value]) => {
                const numeric = Number(value);
                const bar = numeric > 75 ? 'bg-red-500' : numeric > 40 ? 'bg-amber-500' : 'bg-emerald-500';
                return (
                  <div key={String(label)}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">{label}</span>
                      <span className="font-mono text-zinc-200">{numeric.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, numeric)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Signals raised</p>
            <div className="flex flex-wrap gap-2">
              {assessment.reason_codes.length ? assessment.reason_codes.map(code => (
                <span key={code} className="text-[10px] px-2 py-1 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300">
                  {reasonLabel(code)}
                </span>
              )) : (
                <span className="text-[11px] text-zinc-500">No elevated signals.</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
              <p className="text-zinc-500">Model</p>
              <p className="text-zinc-200 font-mono mt-1 truncate">{assessment.model_version}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
              <p className="text-zinc-500">Latency</p>
              <p className="text-zinc-200 font-mono mt-1">{assessment.latency_ms} ms</p>
            </div>
          </div>

          {!isRealBackend && (
            <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-3 text-[11px] text-amber-300">
              Evaluation source: local deterministic demo engine. It is not presented as a backend ML result.
            </div>
          )}
        </div>
      )}
    </section>
  );
};
