import React, { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { PhoneSimulator } from './components/PhoneSimulator';
import { RiskInspector } from './components/RiskInspector';
import { INITIAL_TRANSACTION } from './data/mockData';
import {
  checkBackendHealth,
  DEFAULT_BACKEND_URL,
  evaluateTransactionWithBackend,
} from './services/apiClient';
import { RiskAssessment, SharedTransaction } from './types/sentinel';

export const App: React.FC = () => {
  const [transaction, setTransaction] = useState<SharedTransaction>(INITIAL_TRANSACTION);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [isRealBackend, setIsRealBackend] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const refreshBackend = useCallback(async () => {
    const status = await checkBackendHealth(DEFAULT_BACKEND_URL);
    setIsRealBackend(status.isConnected);
    setBackendError(status.error || null);
  }, []);

  useEffect(() => {
    refreshBackend();
  }, [refreshBackend]);

  const handleLogEvent = (
    eventType: string,
    details: Record<string, unknown> | string,
  ) => {
    const payload = typeof details === 'string' ? details : JSON.stringify(details);
    console.log(`[SentinelAI Audit] [${new Date().toISOString()}] ${eventType}: ${payload}`);
  };

  const handleExecuteTransaction = async (txToExecute: SharedTransaction) => {
    setAssessment(null);
    setIsProcessing(true);
    setPipelineStep(1);
    setBackendError(null);

    setTimeout(() => setPipelineStep(2), 100);
    setTimeout(() => setPipelineStep(3), 220);
    setTimeout(() => setPipelineStep(4), 360);

    const result = await evaluateTransactionWithBackend(
      txToExecute,
      DEFAULT_BACKEND_URL,
    );

    setTransaction(txToExecute);
    setAssessment(result.assessment);
    setIsRealBackend(result.isRealBackend);
    setBackendError(result.error || null);
    setPipelineStep(5);
    setIsProcessing(false);

    handleLogEvent('RISK_EVALUATION_COMPLETED', {
      transaction_id: txToExecute.transaction_id,
      score: result.assessment.composite_score,
      decision: result.assessment.decision,
      source: result.isRealBackend ? 'FASTAPI_BACKEND' : 'LOCAL_DEMO_ENGINE',
    });
  };

  const handleReset = () => {
    setAssessment(null);
    setIsProcessing(false);
    setPipelineStep(0);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 lg:px-6 lg:py-8">
        <div className="flex flex-col lg:flex-row items-start justify-center gap-6 xl:gap-8">
          <div className="w-full lg:w-auto flex justify-center">
            <PhoneSimulator
              transaction={transaction}
              setTransaction={setTransaction}
              assessment={assessment}
              evaluationError={backendError}
              onExecuteTransaction={handleExecuteTransaction}
              onReset={handleReset}
              isProcessing={isProcessing}
              pipelineStep={pipelineStep}
              onLogEvent={handleLogEvent}
            />
          </div>

          <RiskInspector
            assessment={assessment}
            transaction={transaction}
            isRealBackend={isRealBackend}
            backendError={backendError}
          />
        </div>
      </main>
    </div>
  );
};
