import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Loader2, Flag } from 'lucide-react';

export interface ReportTransactionContext {
  transaction_id?: string;
  amount?: number;
  currency?: string;
  receiver_type?: string;
  device_id?: string;
  note?: string;
  [key: string]: unknown;
}

export interface RiskAssessmentData {
  composite_score: number;
  risk_level: string;
  decision?: string;
}

export interface ReportReceiverButtonProps {
  currentUserId: string;
  senderId: string;
  receiverId: string;
  receiverName?: string;
  riskAssessment: RiskAssessmentData | null;
  transactionContext: ReportTransactionContext;
  apiBaseUrl?: string;
  onReportSubmitted?: (reportId: string) => void;
  className?: string;
}

type SubmissionState = 'idle' | 'confirming' | 'loading' | 'success' | 'error';

export const ReportReceiverButton: React.FC<ReportReceiverButtonProps> = ({
  currentUserId,
  senderId,
  receiverId,
  receiverName,
  riskAssessment,
  transactionContext,
  apiBaseUrl = 'http://localhost:8000',
  onReportSubmitted,
  className = '',
}) => {
  const [state, setState] = useState<SubmissionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  // 1. Authorization: Only the initiating sender may view/action the report button
  const isAuthorizedSender = Boolean(currentUserId && senderId && currentUserId === senderId);

  // 2. Visibility Constraint: Strictly rendered ONLY when flagged as "Extremely High Risk" (Score >= 85)
  const isExtremelyHighRisk = Boolean(
    riskAssessment && 
    typeof riskAssessment.composite_score === 'number' && 
    riskAssessment.composite_score >= 85.0
  );

  // If unauthorized or not extremely high risk, do not render in DOM
  if (!isAuthorizedSender || !isExtremelyHighRisk) {
    return null;
  }

  const handleOpenConfirmation = () => {
    setErrorMessage(null);
    setState('confirming');
  };

  const handleCancel = () => {
    setState('idle');
    setErrorMessage(null);
  };

  const handleSubmitReport = async () => {
    setState('loading');
    setErrorMessage(null);

    try {
      const payload = {
        sender_id: senderId,
        receiver_id: receiverId,
        transaction_context: transactionContext,
        timestamp: new Date().toISOString(),
        risk_score: riskAssessment!.composite_score,
      };

      const response = await fetch(`${apiBaseUrl}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authenticated-User-Id': currentUserId,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 201) {
        setReportId(data.report_id);
        setState('success');
        onReportSubmitted?.(data.report_id);
      } else if (response.status === 409) {
        setErrorMessage(data.detail || 'This receiver has already been reported for this transaction.');
        setState('error');
      } else if (response.status === 401 || response.status === 403) {
        setErrorMessage(data.detail || 'Unauthorized: Only the authentic transaction sender can file this report.');
        setState('error');
      } else if (response.status === 422) {
        setErrorMessage(data.detail || 'Report rejected: Receiver does not meet the extreme risk criteria.');
        setState('error');
      } else if (response.status === 429) {
        setErrorMessage(data.detail || 'Too many reports submitted. Please wait before trying again.');
        setState('error');
      } else {
        setErrorMessage(data.detail || 'Failed to submit report. Please try again later.');
        setState('error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error connecting to reporting service.';
      setErrorMessage(msg);
      setState('error');
    }
  };

  return (
    <div className={`user-reporting-widget ${className}`}>
      {/* State 1: Primary Trigger Button */}
      {state === 'idle' && (
        <button
          type="button"
          onClick={handleOpenConfirmation}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-sm"
        >
          <Flag className="w-3.5 h-3.5 text-rose-600" />
          <span>Report Suspicious Receiver (Fraud Alert)</span>
        </button>
      )}

      {/* State 2: Confirmation Dialog Modal */}
      {state === 'confirming' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-rose-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Report High-Risk Receiver</h4>
                <p className="text-xs text-rose-600 font-semibold font-mono">
                  Anomaly Score: {riskAssessment?.composite_score}/100
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-[11px] text-gray-700 space-y-1.5">
              <p className="font-semibold text-rose-900">
                You are about to report: <span className="font-mono">{receiverName || receiverId}</span>
              </p>
              <p className="leading-relaxed">
                Filing this report will escalate this VPA to the NPCI Fraud Registry and permanently flag it across the SentinelAI Zero-Trust Network.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-2 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReport}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Confirm Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 3: Loading State */}
      {state === 'loading' && (
        <div className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 animate-pulse">
          <Loader2 className="w-4 h-4 text-rose-600 animate-spin" />
          <span>Submitting security report...</span>
        </div>
      )}

      {/* State 4: Success State */}
      {state === 'success' && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-[11px]">
            <p className="font-bold">Report Successfully Filed</p>
            <p className="text-emerald-700 mt-0.5 font-mono">Reference: {reportId}</p>
          </div>
        </div>
      )}

      {/* State 5: Error State */}
      {state === 'error' && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2 animate-fadeIn">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium leading-tight">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={handleOpenConfirmation}
            className="text-[10px] font-bold text-rose-700 underline hover:text-rose-800 block ml-6"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
