import { SharedTransaction, RiskAssessment } from '../types/sentinel';
import { calculateRiskAssessment } from './riskEngine';

const viteEnv = (import.meta as ImportMeta & {
  env?: { DEV?: boolean; VITE_API_URL?: string };
}).env;

export const DEFAULT_API_BASE_URL = (
  viteEnv?.VITE_API_URL || (viteEnv?.DEV ? 'http://localhost:8000' : '')
).replace(/\/$/, '');

export const DEFAULT_BACKEND_URL = DEFAULT_API_BASE_URL
  ? `${DEFAULT_API_BASE_URL}/transactions/evaluate`
  : '/transactions/evaluate';

export interface BackendConnectionStatus {
  isConnected: boolean;
  endpoint: string;
  latencyMs?: number;
  lastChecked?: string;
  error?: string;
}

export interface ReceiverReportPayload {
  sender_id: string;
  receiver_id: string;
  risk_score: number;
  reason: string;
  transaction_context: Record<string, unknown>;
}

export interface ReceiverReportResult {
  ok: boolean;
  reportId?: string;
  message: string;
}

export async function evaluateTransactionWithBackend(
  tx: SharedTransaction,
  customBackendUrl: string = DEFAULT_BACKEND_URL
): Promise<{ assessment: RiskAssessment; isRealBackend: boolean; error?: string }> {
  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(customBackendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(tx),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Backend returned HTTP ${response.status}`);
    }

    const realData = await response.json();
    const score = Number(realData.composite_score ?? realData.risk_score ?? 0);
    const realLatency = Math.round(performance.now() - startTime);

    const realAssessment: RiskAssessment = {
      transaction_id: realData.transaction_id || tx.transaction_id,
      composite_score: score,
      decision: realData.decision || (score <= 40 ? 'APPROVE' : score <= 75 ? 'VERIFY' : 'BLOCK'),
      risk_level: realData.risk_level || (score <= 40 ? 'LOW' : score <= 75 ? 'MEDIUM' : 'HIGH'),
      risk_breakdown: {
        anomaly: Number(realData.risk_breakdown?.anomaly ?? 0),
        velocity: Number(realData.risk_breakdown?.velocity ?? 0),
        receiver: Number(realData.risk_breakdown?.receiver ?? 0),
        behavioral: Number(realData.risk_breakdown?.behavioral ?? 0),
      },
      reason_codes: Array.isArray(realData.reason_codes) ? realData.reason_codes : [],
      explanation:
        realData.explanation ||
        `FastAPI evaluated the payment with composite risk ${score}/100.`,
      policy_applied: realData.policy_applied || 'POLICY_FASTAPI_EVALUATION',
      model_version: realData.model_version || 'iforest_v1',
      evaluated_at: realData.evaluated_at || new Date().toISOString(),
      latency_ms: Number(realData.latency_ms ?? realLatency),
      signals: realData.signals || {
        behavioral_cadence: score > 75 ? 'DEVIANT_CADENCE' : score > 40 ? 'MODERATE_VARIANCE' : 'NATURAL_HUMAN_CADENCE',
        geo_hop_velocity: 'LOCAL_RADIUS_MATCH',
        device_trust: tx.device_type === 'android_emulator' ? 'EMULATOR_ENVIRONMENT' : 'PRIMARY_TRUSTED_DEVICE',
        typing_entropy: score > 75 ? 12 : score > 40 ? 58 : 88,
        gyro_tilt: score > 75 ? 0 : score > 40 ? 24.5 : 41.5,
        is_clipboard_paste: tx.device_type === 'android_emulator',
        hardware_trust_score: tx.device_type === 'android_emulator' ? 18 : 96,
        human_probability: score > 75 ? 8 : score > 40 ? 72 : 99,
      },
    };

    return { assessment: realAssessment, isRealBackend: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Backend unreachable';
    const localAssessment = calculateRiskAssessment(tx);
    return {
      assessment: localAssessment,
      isRealBackend: false,
      error: errorMsg,
    };
  }
}

export async function reportReceiver(
  payload: ReceiverReportPayload
): Promise<ReceiverReportResult> {
  const url = DEFAULT_API_BASE_URL ? `${DEFAULT_API_BASE_URL}/reports` : '/reports';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Authenticated-User-Id': payload.sender_id,
      },
      body: JSON.stringify({
        sender_id: payload.sender_id,
        receiver_id: payload.receiver_id,
        risk_score: payload.risk_score,
        timestamp: new Date().toISOString(),
        transaction_context: {
          ...payload.transaction_context,
          report_reason: payload.reason,
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return {
        ok: true,
        reportId: String(data.report_id || ''),
        message: String(data.message || 'Report submitted for review.'),
      };
    }

    const detail =
      typeof data.detail === 'string'
        ? data.detail
        : `Reporting service returned HTTP ${response.status}.`;

    return { ok: false, message: detail };
  } catch (err: unknown) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Unable to reach reporting service.',
    };
  }
}

export async function checkBackendHealth(
  endpointUrl: string = DEFAULT_BACKEND_URL
): Promise<BackendConnectionStatus> {
  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const healthUrl = endpointUrl.replace('/transactions/evaluate', '/health');
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        isConnected: false,
        endpoint: endpointUrl,
        lastChecked: new Date().toLocaleTimeString(),
        error: `Health check returned HTTP ${response.status}`,
      };
    }

    return {
      isConnected: true,
      endpoint: endpointUrl,
      latencyMs: Math.round(performance.now() - startTime),
      lastChecked: new Date().toLocaleTimeString(),
    };
  } catch (err: unknown) {
    return {
      isConnected: false,
      endpoint: endpointUrl,
      lastChecked: new Date().toLocaleTimeString(),
      error: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}


export interface BlockedReceiverRecord {
  sender_id: string;
  receiver_id: string;
  receiver_name?: string | null;
  blocked_at: string;
}

export async function fetchBlockedReceivers(senderId: string): Promise<BlockedReceiverRecord[]> {
  const base = DEFAULT_API_BASE_URL;
  const url = `${base}/blocked-receivers?sender_id=${encodeURIComponent(senderId)}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Blocked receiver lookup returned HTTP ${response.status}`);
  }
  return await response.json() as BlockedReceiverRecord[];
}

export async function blockReceiver(
  senderId: string,
  receiverId: string,
  receiverName?: string,
): Promise<BlockedReceiverRecord> {
  const base = DEFAULT_API_BASE_URL;
  const response = await fetch(`${base}/blocked-receivers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender_id: senderId,
      receiver_id: receiverId,
      receiver_name: receiverName,
    }),
  });
  if (!response.ok) {
    throw new Error(`Block receiver returned HTTP ${response.status}`);
  }
  return await response.json() as BlockedReceiverRecord;
}

export async function unblockReceiver(
  senderId: string,
  receiverId: string,
): Promise<void> {
  const base = DEFAULT_API_BASE_URL;
  const response = await fetch(
    `${base}/blocked-receivers/${encodeURIComponent(receiverId)}?sender_id=${encodeURIComponent(senderId)}`,
    { method: 'DELETE' },
  );
  if (!response.ok && response.status !== 404) {
    throw new Error(`Unblock receiver returned HTTP ${response.status}`);
  }
}
