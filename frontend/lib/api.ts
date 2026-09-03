import axios, { AxiosInstance } from "axios";
import type {
  Transaction,
  EvaluationResponse,
  DashboardSummary,
  RiskDistribution,
  TransactionDetail,
  SalamiAttackAlert,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const LOCAL_TRANSACTIONS_KEY = "sentinelai-transactions";

const SAMPLE_TRANSACTIONS: TransactionDetail[] = [
  {
    transaction_id: "TXN-DEMO-001",
    user_id: "USER-001",
    sender_id: "SENDER-001",
    receiver_id: "RECV-001",
    receiver_type: "individual",
    amount: 5000,
    currency: "INR",
    timestamp: "2026-09-03T08:15:00.000Z",
    device_type: "mobile",
    location: "Mumbai, India",
    composite_score: 18,
    decision: "APPROVE",
    risk_breakdown: { anomaly: 12, velocity: 20, receiver: 15, behavioral: 25 },
    reason_codes: ["NORMAL_BEHAVIOR"],
    status: "completed",
    salami_attack_detected: false,
    salami_risk_level: "LOW",
    cumulative_suspicious_amount: 0,
    explanation: "Transaction matches the user's normal behavior.",
    created_at: "2026-09-03T08:15:00.000Z",
    updated_at: "2026-09-03T08:15:00.000Z",
  },
  {
    transaction_id: "TXN-DEMO-002",
    user_id: "USER-002",
    sender_id: "SENDER-002",
    receiver_id: "RECV-002",
    receiver_type: "business",
    amount: 27500,
    currency: "INR",
    timestamp: "2026-09-03T08:42:00.000Z",
    device_type: "web",
    location: "Delhi, India",
    composite_score: 58,
    decision: "VERIFY",
    risk_breakdown: { anomaly: 62, velocity: 48, receiver: 55, behavioral: 60 },
    reason_codes: ["UNUSUAL_AMOUNT", "NEW_RECEIVER"],
    status: "completed",
    salami_attack_detected: false,
    salami_risk_level: "MEDIUM",
    cumulative_suspicious_amount: 0,
    explanation: "Additional verification is required for this unusual activity.",
    created_at: "2026-09-03T08:42:00.000Z",
    updated_at: "2026-09-03T08:42:00.000Z",
  },
  {
    transaction_id: "TXN-DEMO-003",
    user_id: "USER-003",
    sender_id: "SENDER-003",
    receiver_id: "RECV-003",
    receiver_type: "unknown",
    amount: 99000,
    currency: "INR",
    timestamp: "2026-09-03T09:05:00.000Z",
    device_type: "unknown",
    location: "Unknown",
    composite_score: 86,
    decision: "BLOCK",
    risk_breakdown: { anomaly: 90, velocity: 82, receiver: 88, behavioral: 84 },
    reason_codes: ["HIGH_VELOCITY", "SUSPICIOUS_RECEIVER"],
    status: "completed",
    salami_attack_detected: true,
    salami_indicators: ["Repeated micro-transactions", "Unusual receiver pattern"],
    salami_risk_level: "HIGH",
    cumulative_suspicious_amount: 12000,
    explanation: "Transaction blocked due to multiple high-risk indicators.",
    created_at: "2026-09-03T09:05:00.000Z",
    updated_at: "2026-09-03T09:05:00.000Z",
  },
];

function getLocalTransactions(): TransactionDetail[] {
  if (typeof window === "undefined") return SAMPLE_TRANSACTIONS;
  const stored = window.localStorage.getItem(LOCAL_TRANSACTIONS_KEY);
  if (!stored) {
    window.localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(SAMPLE_TRANSACTIONS));
    return SAMPLE_TRANSACTIONS;
  }
  try {
    return JSON.parse(stored) as TransactionDetail[];
  } catch {
    return SAMPLE_TRANSACTIONS;
  }
}

function saveLocalTransactions(transactions: TransactionDetail[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(transactions));
  }
}

function toTransactionDetail(transaction: Transaction, score: number, decision: EvaluationResponse["decision"]): TransactionDetail {
  const now = new Date().toISOString();
  return {
    ...transaction,
    composite_score: score,
    decision,
    risk_breakdown: { anomaly: score, velocity: score, receiver: score, behavioral: score },
    reason_codes: [decision === "BLOCK" ? "HIGH_RISK_ACTIVITY" : "LOCAL_DEMO_EVALUATION"],
    status: "completed",
    salami_attack_detected: false,
    salami_risk_level: score > 70 ? "HIGH" : score > 40 ? "MEDIUM" : "LOW",
    cumulative_suspicious_amount: 0,
    explanation: "Evaluated by the local demo risk engine.",
    created_at: now,
    updated_at: now,
  };
}

class TransactionAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // ============================================================
  // TRANSACTION EVALUATION
  // ============================================================

  async evaluateTransaction(
    transaction: Transaction
  ): Promise<EvaluationResponse> {
    try {
      const { data } = await this.client.post<EvaluationResponse>("/transactions/evaluate", transaction);
      return data;
    } catch {
      const score = Math.min(100, Math.round(transaction.amount > 50000 ? 82 : transaction.amount > 10000 ? 55 : 18));
      const decision = score > 70 ? "BLOCK" : score > 40 ? "VERIFY" : "APPROVE";
      const detail = toTransactionDetail(transaction, score, decision);
      saveLocalTransactions([detail, ...getLocalTransactions()]);
      return detail;
    }
  }

  // ============================================================
  // TRANSACTION RETRIEVAL
  // ============================================================

  async getTransactions(): Promise<TransactionDetail[]> {
    try {
      const { data } = await this.client.get<TransactionDetail[]>("/transactions");
      return data;
    } catch {
      return getLocalTransactions();
    }
  }

  async getTransactionDetail(
    transactionId: string
  ): Promise<TransactionDetail> {
    try {
      const { data } = await this.client.get<TransactionDetail>(`/transactions/${transactionId}`);
      return data;
    } catch {
      const transaction = getLocalTransactions().find((item) => item.transaction_id === transactionId);
      if (!transaction) throw new Error("Transaction not found");
      return transaction;
    }
  }

  async getSalamiAttackAlerts(): Promise<SalamiAttackAlert[]> {
    try {
      const { data } = await this.client.get<SalamiAttackAlert[]>("/transactions/alerts/salami");
      return data;
    } catch {
      return getLocalTransactions()
        .filter((transaction) => transaction.salami_attack_detected)
        .map((transaction) => ({
          transaction_id: transaction.transaction_id,
          user_id: transaction.user_id,
          amount: transaction.amount,
          composite_score: transaction.composite_score,
          salami_risk_level: transaction.salami_risk_level || "HIGH",
          detection_reason: transaction.explanation || "Suspicious transaction pattern detected.",
          decision: transaction.decision,
          detected_at: transaction.created_at,
          indicators: transaction.salami_indicators || [],
        }));
    }
  }

  // ============================================================
  // DASHBOARD DATA
  // ============================================================

  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const { data } = await this.client.get<DashboardSummary>("/dashboard/summary");
      return data;
    } catch {
      const transactions = getLocalTransactions();
      return {
        total_transactions: transactions.length,
        approved_transactions: transactions.filter((item) => item.decision === "APPROVE").length,
        verified_transactions: transactions.filter((item) => item.decision === "VERIFY").length,
        blocked_transactions: transactions.filter((item) => item.decision === "BLOCK").length,
        high_risk_transactions: transactions.filter((item) => item.composite_score > 70).length,
        salami_attack_alerts: transactions.filter((item) => item.salami_attack_detected).length,
        amount_protected: transactions.filter((item) => item.decision === "BLOCK").reduce((sum, item) => sum + item.amount, 0),
        cumulative_suspicious_amount: transactions.reduce((sum, item) => sum + (item.cumulative_suspicious_amount || 0), 0),
        verification_required_count: transactions.filter((item) => item.decision === "VERIFY").length,
      };
      }
  }

  async getRiskDistribution(): Promise<RiskDistribution> {
    try {
      const { data } = await this.client.get<RiskDistribution>("/dashboard/risk-distribution");
      return data;
    } catch {
      const transactions = getLocalTransactions();
      return {
        low_risk: transactions.filter((item) => item.composite_score <= 40).length,
        medium_risk: transactions.filter((item) => item.composite_score > 40 && item.composite_score <= 70).length,
        high_risk: transactions.filter((item) => item.composite_score > 70).length,
      };
      }
  }

  // ============================================================
  // HEALTH CHECK
  // ============================================================

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get("/health");
      return true;
    } catch {
      return false;
    }
  }
}

export const transactionAPI = new TransactionAPI();
