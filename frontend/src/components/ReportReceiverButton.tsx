import React, { useEffect, useState } from 'react';
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

async function submitReceiverReport(
  payload: Record<string, unknown>,
  currentUserId: string,
  apiBaseUrl?: string,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const normalizedBase = apiBaseUrl ? apiBaseUrl.replace(/\/+$/, '') : '';
  const urls = [
    ...(normalizedBase ? [`${normalizedBase}/reports`] : []),
    '/reports',
    'http://127.0.0.1:8000/reports',
    'http://localhost:8000/reports',
  ];
  let lastStatus = 0;
  let lastData: Record<string, unknown> = {};

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Authenticated-User-Id': currentUserId,
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      lastStatus = response.status;
      lastData = data;
      if (response.status !== 404) {
        return { status: response.status, data };
      }
    } catch {
      continue;
    }
  }

  return { status: lastStatus || 0, data: lastData };
}

function reportStorageKey(userId: string): string {
  return `sentinelai.receiver-report.${userId}`;
}

function formatApiDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'msg' in item) {
        return String((item as { msg: string }).msg);
      }
      return '';
    }).filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  return fallback;
}

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
  const existingReportId = typeof window !== 'undefined'
    ? window.localStorage.getItem(reportStorageKey(currentUserId || senderId))
    : null;
  const [state, setState] = useState<SubmissionState>(existingReportId ? 'success' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(existingReportId);

  useEffect(() => {
    const stored = window.localStorage.getItem(reportStorageKey(currentUserId || senderId));
    if (stored) {
      setReportId(stored);
      setState('success');
    }
  }, [currentUserId, senderId]);

  // 1. Authorization: Only the initiating sender may view/action the report button
  const effectiveCurrentUserId = currentUserId || senderId;
  const isAuthorizedSender = Boolean(effectiveCurrentUserId && senderId && effectiveCurrentUserId === senderId);

  // 2. Visibility Constraint: Strictly rendered ONLY when flagged as "Extremely High Risk" (Score > 75 / BLOCK)
  const isExtremelyHighRisk = Boolean(
    riskAssessment && 
    (
      (typeof riskAssessment.composite_score === 'number' && riskAssessment.composite_score > 75.0) ||
      riskAssessment.risk_level === 'HIGH' ||
      riskAssessment.decision === 'BLOCK'
    )
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

      const { status, data } = await submitReceiverReport(payload, currentUserId || senderId, apiBaseUrl);

      if (status === 201 || status === 200) {
        const id = String(data.report_id || '');
        setReportId(id);
        setState('success');
        if (id) {
          window.localStorage.setItem(reportStorageKey(senderId || currentUserId), id);
        }
        onReportSubmitted?.(id);
      } else if (status === 409) {
        const storedId = String(data.report_id || window.localStorage.getItem(reportStorageKey(senderId || currentUserId)) || 'ALREADY-FILED');
        window.localStorage.setItem(reportStorageKey(senderId || currentUserId), storedId);
        setReportId(storedId);
        setState('success');
      } else if (status === 401 || status === 403) {
        setErrorMessage(formatApiDetail(data.detail, 'Unauthorized: Only the authentic transaction sender can file this report.'));
        setState('error');
      } else if (status === 422) {
        setErrorMessage(formatApiDetail(data.detail, 'Report rejected: Receiver does not meet the extreme risk criteria.'));
        setState('error');
      } else if (status === 429) {
        setErrorMessage(formatApiDetail(data.detail, 'Too many reports submitted. Please wait before trying again.'));
        setState('error');
      } else if (status === 404) {
        setErrorMessage(formatApiDetail(data.detail, 'Reporting service was not found. Confirm FastAPI is running on port 8000.'));
        setState('error');
      } else {
        setErrorMessage(formatApiDetail(data.detail, 'Failed to submit report. Please try again later.'));
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
