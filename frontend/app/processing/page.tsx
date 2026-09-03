"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProcessingPipeline } from "@/components/domain/ProcessingPipeline";
import { RiskGauge } from "@/components/domain/RiskGauge";
import { DecisionDisplay } from "@/components/domain/DecisionDisplay";
import { RiskBreakdownDisplay } from "@/components/domain/RiskBreakdownDisplay";
import { SalamiIndicatorsDisplay } from "@/components/domain/SalamiIndicatorsDisplay";
import { transactionAPI } from "@/lib/api";
import type { TransactionDetail, ProcessingStep } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const PROCESSING_STEPS: ProcessingStep[] = [
  "received",
  "intercepted",
  "behavioral_analysis",
  "salami_detection",
  "risk_calculation",
  "decision_engine",
  "completed",
];

const STEP_DURATION_MS = 800;

function TransactionProcessing() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get("transactionId");
  const decision = searchParams.get("decision");

  const [transaction, setTransaction] = useState<TransactionDetail | null>(
    null
  );
  const [processingStep, setProcessingStep] = useState<ProcessingStep | null>(
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

        // Simulate processing pipeline
        for (let i = 0; i < PROCESSING_STEPS.length; i++) {
          setProcessingStep(PROCESSING_STEPS[i]);
          await new Promise((resolve) => setTimeout(resolve, STEP_DURATION_MS));
        }

        // Load actual transaction
        const txn = await transactionAPI.getTransactionDetail(transactionId);
        setTransaction(txn);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load transaction details"
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
            Error Processing Transaction
          </h2>
          <p className="text-text-tertiary mb-6">{error}</p>
          <Link href="/simulator">
            <Button variant="primary">← Back to Simulator</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (loading || !transaction) {
    return (
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Processing Transaction
            </h1>
            <p className="text-text-tertiary">
              Analyzing transaction with SentinelAI...
            </p>
          </div>

          {/* Processing Pipeline */}
          <Card>
            <ProcessingPipeline
              currentStep={processingStep}
              isProcessing={true}
            />
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Transaction Analysis Complete
          </h1>
          <p className="text-text-tertiary">
            Transaction ID: {transaction.transaction_id}
          </p>
        </div>

        {/* Main Decision Section */}
        <DecisionDisplay
          decision={transaction.decision}
          score={transaction.composite_score}
          explanation={transaction.explanation}
          reasonCodes={transaction.reason_codes}
        />

        {/* Content Grid */}
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
            <SalamiIndicatorsDisplay
              indicators={transaction.salami_indicators}
              riskLevel={transaction.salami_risk_level || "LOW"}
            />
          )}

        {/* Transaction Details */}
        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            📋 Transaction Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-tertiary">User ID</p>
              <p className="font-mono text-text-primary">{transaction.user_id}</p>
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
            <div>
              <p className="text-text-tertiary">Amount</p>
              <p className="font-semibold text-text-primary">
                {formatCurrency(transaction.amount)}
              </p>
            </div>
            <div>
              <p className="text-text-tertiary">Timestamp</p>
              <p className="text-text-primary">
                {formatDateTime(transaction.timestamp)}
              </p>
            </div>
            <div>
              <p className="text-text-tertiary">Device Type</p>
              <p className="text-text-primary">{transaction.device_type || "N/A"}</p>
            </div>
            <div>
              <p className="text-text-tertiary">Location</p>
              <p className="text-text-primary">{transaction.location || "N/A"}</p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <Link href="/monitoring">
            <Button variant="secondary">
              📊 View in Monitoring Dashboard
            </Button>
          </Link>
          <Link href="/simulator">
            <Button variant="primary">🎯 New Transaction</Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={null}>
      <TransactionProcessing />
    </Suspense>
  );
}
