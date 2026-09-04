import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { PhoneSimulator } from './components/PhoneSimulator';
import { RiskPopups } from './components/RiskPopups';
import { FestiveCelebration } from './components/FestiveCelebration';
import { SharedTransaction, RiskAssessment } from './types/sentinel';
import { INITIAL_TRANSACTION } from './data/mockData';
import { 
  evaluateTransactionWithBackend, 
  checkBackendHealth, 
  DEFAULT_BACKEND_URL 
} from './services/apiClient';

export const App: React.FC = () => {
  const [transaction, setTransaction] = useState<SharedTransaction>(INITIAL_TRANSACTION);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pipelineStep, setPipelineStep] = useState<number>(0);

  // Backend Integration State
  const [backendEndpoint] = useState<string>(DEFAULT_BACKEND_URL);

  // Popup & Celebration Modal States
  const [showMediumModal, setShowMediumModal] = useState<boolean>(false);
  const [showHighModal, setShowHighModal] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Check Backend Connectivity on Mount
  const handleCheckBackendHealth = useCallback(async () => {
    await checkBackendHealth(backendEndpoint);
  }, [backendEndpoint]);

  useEffect(() => {
    handleCheckBackendHealth();
  }, [handleCheckBackendHealth]);

  // Frontend Interaction Event Logging
  const handleLogEvent = (eventType: string, details: Record<string, unknown> | string) => {
    const logString = typeof details === 'string' ? details : JSON.stringify(details);
    console.log(`[SentinelAI Audit] [${new Date().toISOString()}] ${eventType}: ${logString}`);
  };

  const handleExecuteTransaction = async (txToExecute: SharedTransaction) => {
    setIsProcessing(true);
    setPipelineStep(1);
    setShowMediumModal(false);
    setShowHighModal(false);
    setShowCelebration(false);

    handleLogEvent('PIPELINE_INITIATED', { 
      amount: txToExecute.amount, 
      receiver: txToExecute.receiver_id,
      endpoint: backendEndpoint 
    });

    setTimeout(() => setPipelineStep(2), 100);
    setTimeout(() => setPipelineStep(3), 220);
    setTimeout(() => setPipelineStep(4), 360);
    setTimeout(() => setPipelineStep(5), 500);

    // Call Real FastAPI Backend (with automatic fallback to local deterministic ML engine)
    const { assessment: result, isRealBackend: backendSuccess } = 
      await evaluateTransactionWithBackend(txToExecute, backendEndpoint);

    setTimeout(() => {
      setAssessment(result);
      setIsProcessing(false);

      handleLogEvent('RISK_EVALUATION_COMPLETED', { 
        score: result.composite_score, 
        decision: result.decision,
        source: backendSuccess ? 'FASTAPI_BACKEND' : 'DETERMINISTIC_ENGINE'
      });

      if (result.composite_score <= 40) {
        setShowCelebration(true);
      } else if (result.composite_score <= 75) {
        setShowMediumModal(true);
      } else {
        setShowHighModal(true);
      }
    }, 600);
  };

  const handleReset = () => {
    setAssessment(null);
    setPipelineStep(0);
    setIsProcessing(false);
    setShowMediumModal(false);
    setShowHighModal(false);
    setShowCelebration(false);
    handleLogEvent('TRANSACTION_RESET', { action: 'RESET' });
  };

  return (
    <div 
      className="min-h-screen flex flex-col transition-all duration-300"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)'
      }}
    >
      {/* Top Header Bar */}
      <Header />

      {/* Main Content Area: Phone Interface Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 lg:p-6 flex items-center justify-center">
        <div className="flex justify-center w-full">
          <PhoneSimulator
            transaction={transaction}
            setTransaction={setTransaction}
            assessment={assessment}
            onExecuteTransaction={handleExecuteTransaction}
            onReset={handleReset}
            isProcessing={isProcessing}
            pipelineStep={pipelineStep}
            onLogEvent={handleLogEvent}
          />
        </div>
      </main>

      {/* Dynamic Popups */}
      <RiskPopups
        assessment={assessment}
        transaction={transaction}
        showMediumModal={showMediumModal}
        showHighModal={showHighModal}
        onDismissMediumModal={() => setShowMediumModal(false)}
        onDismissHighModal={() => setShowHighModal(false)}
      />

      {/* Festive Success Celebration */}
      {showCelebration && (
        <FestiveCelebration
          amount={transaction.amount}
          receiverName={transaction.receiver_name || transaction.receiver_id}
          transactionId={transaction.transaction_id}
          onDismiss={() => setShowCelebration(false)}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(prev => !prev)}
        />
      )}

    </div>
  );
};
