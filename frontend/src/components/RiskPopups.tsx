import React from 'react';
import { AlertTriangle, ShieldAlert, X, AlertOctagon, CheckCircle2, ArrowRight } from 'lucide-react';
import { RiskAssessment, SharedTransaction } from '../types/sentinel';

interface RiskPopupsProps {
  assessment: RiskAssessment | null;
  transaction: SharedTransaction;
  onDismissMediumModal?: () => void;
  onDismissHighModal?: () => void;
  showMediumModal: boolean;
  showHighModal: boolean;
}

export const RiskPopups: React.FC<RiskPopupsProps> = ({
  assessment,
  transaction,
  onDismissMediumModal,
  onDismissHighModal,
  showMediumModal,
  showHighModal,
}) => {
  if (!assessment) return null;

  const score = assessment.composite_score;

  return (
    <>
      {/* 1. NON-BLOCKING MEDIUM RISK POPUP NOTIFICATION (Scores 41 - 75) */}
      {score > 40 && score <= 75 && showMediumModal && (
        <div 
          className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce-short transition-all duration-300 pointer-events-auto"
          role="alert"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A1408] via-[#120F08] to-[#0A0E17] border-2 border-amber-500 shadow-[0_0_35px_rgba(245,158,11,0.45)] p-5 text-white">
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-start gap-3.5">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    STEP-UP SECURITY (Score: {score}/100)
                  </span>
                  <span className="text-[11px] font-mono text-amber-400/80">
                    {assessment.latency_ms}ms
                  </span>
                </div>

                <h4 className="text-sm font-bold text-amber-200">
                  Step 2 Verification Prompted
                </h4>
                
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Composite anomaly rating is <span className="text-amber-400 font-semibold">{score}/100</span>. Please re-enter your security PIN on the device to authorize immediate completion under user liability.
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-950/40 px-2 py-1 rounded border border-amber-500/30">
                    <CheckCircle2 className="w-3 h-3 text-amber-400" />
                    <span>Irreversible User Override Active</span>
                  </div>
                  {onDismissMediumModal && (
                    <button
                      onClick={onDismissMediumModal}
                      className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>

              {onDismissMediumModal && (
                <button
                  onClick={onDismissMediumModal}
                  className="flex-shrink-0 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition"
                  aria-label="Close notification"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. PROMINENT HIGH RISK POPUP WARNING (Scores > 75) */}
      {score > 75 && showHighModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-gradient-to-b from-[#220707] via-[#160505] to-[#0A0404] border-2 border-red-500/80 shadow-[0_0_60px_rgba(239,68,68,0.65)] p-6 sm:p-8 text-white animate-scale-up">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse"></div>
            <div className="absolute -top-24 -right-24 w-56 h-56 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col items-center text-center">
              <div className="relative w-20 h-20 rounded-2xl bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-400 mb-5 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                <ShieldAlert className="w-10 h-10 animate-bounce" />
                <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-mono font-bold bg-red-600 text-white rounded-full uppercase tracking-wider">
                  HIGH RISK
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 text-xs font-mono font-bold uppercase rounded-full bg-red-950/80 text-red-300 border border-red-500/50">
                  MANDATORY DUAL-PIN CHALLENGE
                </span>
                <span className="px-3 py-1 text-xs font-mono font-bold rounded-full bg-red-500 text-slate-950">
                  SCORE: {score}/100
                </span>
              </div>

              <h3 className="text-2xl font-black text-white tracking-tight sm:text-3xl mb-3">
                High Risk Warning Acknowledged
              </h3>

              <p className="text-sm text-red-200/90 max-w-lg mb-6 leading-relaxed">
                SentinelAI detected critical anomaly signals for <span className="font-bold text-white font-mono">₹{transaction.amount.toLocaleString('en-IN')}</span> to <span className="font-bold text-white">{transaction.receiver_name}</span>. Entering your secondary PIN authorizes immediate, irreversible dispatch under user liability.
              </p>

              {/* Threat Signals */}
              <div className="w-full bg-[#120404] border border-red-900/60 rounded-2xl p-4 mb-6 text-left">
                <div className="flex items-center justify-between text-xs font-mono text-red-400 font-semibold mb-2">
                  <span className="flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
                    TRIGGERED THREAT SIGNALS:
                  </span>
                  <span>POLICY: {assessment.policy_applied}</span>
                </div>

                <div className="space-y-1.5">
                  {assessment.reason_codes.map((code, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-red-950/40 border border-red-800/40 text-red-200">
                      <span className="font-mono font-bold">{code}</span>
                      <span className="text-[11px] text-red-400">CRITICAL MATCH</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="w-full">
                {onDismissHighModal && (
                  <button
                    onClick={onDismissHighModal}
                    className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-sm shadow-[0_0_25px_rgba(239,68,68,0.5)] transition flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Secondary PIN Entry on Device</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
