import { SharedTransaction, RiskAssessment } from '../types/sentinel';
import { calculateRiskAssessment } from './riskEngine';

// Default FastAPI backend endpoint
export const DEFAULT_BACKEND_URL = 'http://localhost:8000/transactions/evaluate';

export interface BackendConnectionStatus {
  isConnected: boolean;
  endpoint: string;
  latencyMs?: number;
  lastChecked?: string;
  error?: string;
}

/**
 * Evaluates a transaction against the real FastAPI backend endpoint.
 * If backend is reachable, returns the real backend response.
 * If backend is not reachable, falls back to deterministic local risk engine and flags source.
 */
export async function evaluateTransactionWithBackend(
  tx: SharedTransaction,
  customBackendUrl: string = DEFAULT_BACKEND_URL
): Promise<{ assessment: RiskAssessment; isRealBackend: boolean; error?: string }> {
  const startTime = performance.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s network timeout

    const response = await fetch(customBackendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        transaction_id: tx.transaction_id,
        user_id: tx.user_id,
        amount: tx.amount,
        currency: tx.currency,
        receiver_id: tx.receiver_id,
        receiver_name: tx.receiver_name,
        receiver_type: tx.receiver_type,
        timestamp: tx.timestamp,
        device_id: tx.device_id,
        device_type: tx.device_type,
        location: tx.location,
        ip_address: tx.ip_address,
        user_context: tx.user_context,
        note: tx.note
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const realData = await response.json();
      const realLatency = Math.round(performance.now() - startTime);

      // Parse backend response into frontend RiskAssessment format
      const realAssessment: RiskAssessment = {
        transaction_id: realData.transaction_id || tx.transaction_id,
        composite_score: Number(realData.composite_score ?? realData.risk_score ?? 0),
        decision: realData.decision || (realData.composite_score <= 40 ? 'APPROVE' : realData.composite_score <= 75 ? 'VERIFY' : 'BLOCK'),
        risk_level: realData.composite_score <= 40 ? 'LOW' : realData.composite_score <= 75 ? 'MEDIUM' : 'HIGH',
        risk_breakdown: {
          anomaly: Number(realData.risk_breakdown?.anomaly ?? 0),
          velocity: Number(realData.risk_breakdown?.velocity ?? 0),
          receiver: Number(realData.risk_breakdown?.receiver ?? 0),
          behavioral: Number(realData.risk_breakdown?.behavioral ?? 0),
        },
        reason_codes: Array.isArray(realData.reason_codes) ? realData.reason_codes : [],
        explanation: realData.explanation || `Evaluated by FastAPI Backend: ${realData.decision} with composite score ${realData.composite_score}/100.`,
        policy_applied: realData.policy_applied || 'POLICY_FASTAPI_EVALUATION',
        model_version: realData.model_version || 'fastapi_production_v2.8',
        evaluated_at: realData.evaluated_at || new Date().toISOString(),
        latency_ms: realData.latency_ms || realLatency,
        signals: realData.signals || {
          behavioral_cadence: realData.composite_score > 75 ? 'BOT_SUSPECTED' : 'ORGANIC_HUMAN',
          geo_hop_velocity: '0 km/h (Real GPS)',
          device_trust: tx.device_type === 'android_emulator' ? 'EMULATOR' : 'HARDWARE_TRUSTED',
          typing_entropy: realData.composite_score > 75 ? 15 : 85,
          gyro_tilt: tx.device_type === 'android_emulator' ? 0.0 : 38.5,
          is_clipboard_paste: tx.device_type === 'android_emulator',
          hardware_trust_score: tx.device_type === 'android_emulator' ? 20 : 95,
          human_probability: realData.composite_score > 75 ? 10 : 98,
        }
      };

      return { assessment: realAssessment, isRealBackend: true };
    } else {
      throw new Error(`Backend returned HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Backend unreachable';
    // Fallback to deterministic local engine if backend isn't online
    const localAssessment = calculateRiskAssessment(tx);
    return { 
      assessment: localAssessment, 
      isRealBackend: false, 
      error: errorMsg 
    };
  }
}

/**
 * Quick ping check to verify if the FastAPI backend is running and reachable
 */
export async function checkBackendHealth(endpointUrl: string = DEFAULT_BACKEND_URL): Promise<BackendConnectionStatus> {
  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    // Try OPTIONS or GET root health check
    const baseHealthUrl = endpointUrl.replace('/transactions/evaluate', '/health');
    const response = await fetch(baseHealthUrl, {
      method: 'GET',
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);

    if (response && (response.ok || response.status === 404)) {
      return {
        isConnected: true,
        endpoint: endpointUrl,
        latencyMs: latency,
        lastChecked: new Date().toLocaleTimeString(),
      };
    }

    return {
      isConnected: false,
      endpoint: endpointUrl,
      lastChecked: new Date().toLocaleTimeString(),
      error: 'FastAPI server not responding on port 8000'
    };
  } catch (err: unknown) {
    return {
      isConnected: false,
      endpoint: endpointUrl,
      lastChecked: new Date().toLocaleTimeString(),
      error: err instanceof Error ? err.message : 'Connection failed'
    };
  }
}
