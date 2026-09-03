"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RiskGauge } from "@/components/domain/RiskGauge";
import { DecisionDisplay } from "@/components/domain/DecisionDisplay";
import { RiskBreakdownDisplay } from "@/components/domain/RiskBreakdownDisplay";
import { SalamiIndicatorsDisplay } from "@/components/domain/SalamiIndicatorsDisplay";
import { transactionAPI } from "@/lib/api";
import type { TransactionDetail } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function TransactionDetails() {
  const params = useParams();
  const transactionId = params.id as string;

  const [transaction, setTransaction] = useState<TransactionDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTransaction = async () => {
      if (!transactionId) {
        setError("No transaction ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await transactionAPI.getTransactionDetail(transactionId);
        setTransaction(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load transaction"
        );
      } finally {
        setLoading(false);
      }
    };

    loadTransaction();
  }, [transactionId]);

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-accent-block mb-2">
            Error Loading Transaction
          </h2>
          <p className="text-text-tertiary mb-6">{error}</p>
          <Link href="/monitoring">
            <Button variant="primary">← Back to Monitoring</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <p className="text-text-tertiary">Loading transaction details...</p>
        </div>
      </AppLayout>
    );
  }

  if (!transaction) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-text-tertiary">Transaction not found</p>
          <Link href="/monitoring">
            <Button variant="primary" className="mt-4">← Back to Monitoring</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Transaction Details
            </h1>
            <p className="text-text-tertiary font-mono">
              {transaction.transaction_id}
            </p>
          </div>
          <Badge
            variant={
              transaction.decision === "APPROVE"
                ? "approve"
                : transaction.decision === "VERIFY"
                  ? "verify"
                  : "block"
            }
            size="lg"
          >
            {transaction.decision}
          </Badge>
        </div>

        {/* Main Decision */}
        <DecisionDisplay
          decision={transaction.decision}
          score={transaction.composite_score}
          explanation={transaction.explanation}
          reasonCodes={transaction.reason_codes}
        />

        {/* Risk Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Gauge */}
          <Card className="flex justify-center">
            <RiskGauge breakdown={transaction.risk_breakdown} size="md" />
          </Card>

          {/* Risk Breakdown */}
          <div className="lg:col-span-2">
            <RiskBreakdownDisplay {...transaction.risk_breakdown} />
          </div>
        </div>

        {/* Salami Attack Analysis */}
        {transaction.salami_indicators &&
          transaction.salami_indicators.length > 0 && (
            <>
              <SalamiIndicatorsDisplay
                indicators={transaction.salami_indicators}
                riskLevel={transaction.salami_risk_level || "LOW"}
              />

              {transaction.cumulative_suspicious_amount && (
                <Card>
                  <h2 className="text-lg font-semibold text-text-primary mb-4">
                    💰 Cumulative Impact
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-text-tertiary text-sm">
                        Cumulative Suspicious Amount
                      </p>
                      <p className="text-2xl font-bold text-accent-block">
                        {formatCurrency(
                          transaction.cumulative_suspicious_amount
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-tertiary text-sm">
                        Individual Amount
                      </p>
                      <p className="text-2xl font-bold text-text-primary">
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-tertiary text-sm">Risk Level</p>
                      <p className="text-2xl font-bold text-accent-verify">
                        {transaction.salami_risk_level || "MEDIUM"}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

        {/* Full Transaction Details */}
        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            📋 Transaction Information
          </h2>

          <div className="space-y-4">
            {/* Transaction Basics */}
            <div>
              <h3 className="text-sm font-semibold text-text-secondary mb-3">
                Transaction Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-tertiary">Transaction ID</p>
                  <p className="font-mono text-text-primary">
                    {transaction.transaction_id}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Status</p>
                  <Badge variant="info" size="sm">
                    {transaction.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-text-tertiary">Timestamp</p>
                  <p className="text-text-primary">
                    {formatDateTime(transaction.timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Amount</p>
                  <p className="font-semibold text-text-primary">
                    {formatCurrency(transaction.amount)} {transaction.currency}
                  </p>
                </div>
              </div>
            </div>

            {/* User & Parties */}
            <div className="border-t border-border-default pt-4">
              <h3 className="text-sm font-semibold text-text-secondary mb-3">
                Parties
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-tertiary">User ID</p>
                  <p className="font-mono text-text-primary">
                    {transaction.user_id}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Sender ID</p>
                  <p className="font-mono text-text-primary">
                    {transaction.sender_id || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Receiver ID</p>
                  <p className="font-mono text-text-primary">
                    {transaction.receiver_id}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Receiver Type</p>
                  <p className="text-text-primary">
                    {transaction.receiver_type || "Unknown"}
                  </p>
                </div>
              </div>
            </div>

            {/* Context & Device Info */}
            <div className="border-t border-border-default pt-4">
              <h3 className="text-sm font-semibold text-text-secondary mb-3">
                Context
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-tertiary">Device Type</p>
                  <p className="text-text-primary">{transaction.device_type || "N/A"}</p>
                </div>
                <div>
                  <p className="text-text-tertiary">Device ID</p>
                  <p className="font-mono text-text-primary">
                    {transaction.device_id || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Location</p>
                  <p className="text-text-primary">{transaction.location || "N/A"}</p>
                </div>
                <div>
                  <p className="text-text-tertiary">IP Address</p>
                  <p className="font-mono text-text-primary">
                    {transaction.ip_address || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="border-t border-border-default pt-4">
              <h3 className="text-sm font-semibold text-text-secondary mb-3">
                Risk Assessment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-tertiary">Composite Score</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {transaction.composite_score}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Decision</p>
                  <Badge
                    variant={
                      transaction.decision === "APPROVE"
                        ? "approve"
                        : transaction.decision === "VERIFY"
                          ? "verify"
                          : "block"
                    }
                    size="md"
                  >
                    {transaction.decision}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="border-t border-border-default pt-4">
              <h3 className="text-sm font-semibold text-text-secondary mb-3">
                Audit
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-tertiary">Created</p>
                  <p className="text-text-primary">
                    {formatDateTime(transaction.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Updated</p>
                  <p className="text-text-primary">
                    {formatDateTime(transaction.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <Link href="/monitoring">
            <Button variant="secondary">← Back to Monitoring</Button>
          </Link>
          <Link href="/simulator">
            <Button variant="primary">🎯 New Transaction</Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
