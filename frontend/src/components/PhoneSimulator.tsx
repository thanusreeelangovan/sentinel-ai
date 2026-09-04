import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  ArrowLeft,
  ArrowRight,
  Lock, 
  Wifi, 
  Battery, 
  RotateCcw,
  Fingerprint,
  Delete,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Info,
  XCircle,
  ShieldAlert,
  Sparkles,
  Eye
} from 'lucide-react';
import { Payee, SharedTransaction, RiskAssessment } from '../types/sentinel';
import { PRESET_PAYEES, PRESET_AMOUNTS } from '../data/mockData';
import { generateSHAPFeatures } from '../services/riskEngine';
import { ReportReceiverButton } from './ReportReceiverButton';

const INITIAL_AVAILABLE_BALANCE = 1000000;
const ACCOUNT_LAST4 = '4092';
const BACKEND_BASE_URL = 'http://localhost:8000';

interface PhoneSimulatorProps {
  transaction: SharedTransaction;
  setTransaction: React.Dispatch<React.SetStateAction<SharedTransaction>>;
  assessment: RiskAssessment | null;
  onExecuteTransaction: (tx: SharedTransaction) => void;
  onReset: () => void;
  isProcessing: boolean;
  pipelineStep: number;
  onLogEvent?: (eventType: string, details: Record<string, unknown> | string) => void;
}

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({
  transaction,
  setTransaction,
  assessment,
  onExecuteTransaction,
  onReset,
  isProcessing,
  pipelineStep,
  onLogEvent,
}) => {
  const [screen, setScreen] = useState<'form' | 'primary_pin' | 'pipeline' | 'interstitial' | 'step2_pin' | 'result' | 'fallback'>('form');
  const [primaryPin, setPrimaryPin] = useState<string>('');
  const [secondaryPin, setSecondaryPin] = useState<string>('');
  const [selectedPayee, setSelectedPayee] = useState<Payee>(PRESET_PAYEES[0]);
  const [customAmount, setCustomAmount] = useState<string>(transaction.amount.toString());
  const [amountError, setAmountError] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [showShapDetails, setShowShapDetails] = useState<boolean>(false);
  const [availableBalance, setAvailableBalance] = useState<number>(INITIAL_AVAILABLE_BALANCE);
  const lastSettledTxnId = useRef<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const lastKeypadPressTime = useRef<number>(0);

  useEffect(() => {
    if (isProcessing) {
      setScreen('pipeline');
    } else if (assessment) {
      if (assessment.composite_score > 40 && screen === 'pipeline') {
        // Intercept right after primary PIN submission & evaluation, before Step 2 keypad
        setScreen('interstitial');
        setSecondaryPin('');
        setErrorMessage(null);
      } else if (screen === 'pipeline') {
        settleCompletedPayment();
      }
    }
  }, [isProcessing, assessment]);

  const settleCompletedPayment = () => {
    const amount = Number(transaction.amount) || 0;
    if (lastSettledTxnId.current !== transaction.transaction_id) {
      setAvailableBalance((prev) => Math.max(0, Number((prev - amount).toFixed(2))));
      lastSettledTxnId.current = transaction.transaction_id;
    }
    setScreen('result');
  };

  const handleSelectPayee = (payee: Payee) => {
    setSelectedPayee(payee);
    const amt = Math.min(payee.defaultAmount, 100000);
    setCustomAmount(amt.toString());
    setAmountError(null);
    setTransaction(prev => ({
      ...prev,
      receiver_id: payee.vpa,
      receiver_name: payee.name,
      receiver_type: payee.receiver_type,
      amount: amt,
      note: payee.defaultNote,
      device_type: payee.presetRisk === 'high' ? 'android_emulator' : 'primary_ios',
      device_id: payee.presetRisk === 'high' ? 'DEV_ROOTED_EMU_x86' : 'DEV_APPL_IPHONE_15_PRO_ENCLAVE',
    }));
    onLogEvent?.('PAYEE_SELECTED', { payee_id: payee.id, receiver_type: payee.receiver_type });
  };

  const handleAmountChange = (amt: number) => {
    const safeAmt = Math.min(amt, 100000);
    setCustomAmount(safeAmt.toString());
    setAmountError(null);
    setTransaction(prev => ({ ...prev, amount: safeAmt }));
    onLogEvent?.('AMOUNT_CHANGED', { amount: safeAmt });
  };

  const handleCustomAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Strictly accept only numeric characters and at most one decimal point
    raw = raw.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) {
      raw = parts[0] + '.' + parts.slice(1).join('');
    }
    // Maximum of two decimal places
    if (parts[1] && parts[1].length > 2) {
      raw = parts[0] + '.' + parts[1].slice(0, 2);
    }

    if (raw === '') {
      setCustomAmount('');
      setTransaction(prev => ({ ...prev, amount: 0 }));
      setAmountError(null);
      return;
    }

    const num = parseFloat(raw);
    if (isNaN(num)) {
      setCustomAmount(raw);
      setAmountError('Please enter a valid numeric currency amount.');
      return;
    }

    if (num > 100000) {
      setCustomAmount(raw);
      setTransaction(prev => ({ ...prev, amount: num }));
      setAmountError('Transaction limit exceeded: Maximum allowed amount per UPI transaction is ₹1,00,000.');
      return;
    }

    if (num <= 0) {
      setCustomAmount(raw);
      setTransaction(prev => ({ ...prev, amount: num }));
      setAmountError('Transaction amount must be greater than ₹0.');
      return;
    }

    setAmountError(null);
    setCustomAmount(raw);
    setTransaction(prev => ({ ...prev, amount: num }));
    onLogEvent?.('AMOUNT_CUSTOM_INPUT', { amount: num });
  };

  const handleKeypadPress = (digit: string, isSecondary: boolean = false) => {
    const now = Date.now();
    if (now - lastKeypadPressTime.current < 75) return;
    lastKeypadPressTime.current = now;

    if (isShaking) return;

    if (!isSecondary) {
      if (primaryPin.length < 4) {
        const nextPin = primaryPin + digit;
        setPrimaryPin(nextPin);
        setErrorMessage(null);

        if (nextPin.length === 4) {
          onLogEvent?.('PRIMARY_PIN_SUBMITTED', { 
            pin_length: 4, 
            has_biometric: false,
            timestamp: new Date().toISOString()
          });

          setTimeout(() => {
            onExecuteTransaction(transaction);
          }, 180);
        }
      }
    } else {
      if (secondaryPin.length < 4) {
        const nextSecondary = secondaryPin + digit;
        setSecondaryPin(nextSecondary);
        setErrorMessage(null);

        if (nextSecondary.length === 4) {
          if (primaryPin === nextSecondary) {
            onLogEvent?.('DUAL_PIN_MATCH_SUCCESS', {
              matched: true,
              user_liability_acknowledged: true,
              final_status: 'PAYMENT_SUCCESSFUL'
            });

            setTimeout(() => {
              settleCompletedPayment();
            }, 200);
          } else {
            onLogEvent?.('DUAL_PIN_MATCH_FAILURE', {
              matched: false,
              error_code: 'ERR_PIN_MISMATCH',
              error_message: 'Wrong primary pin'
            });

            setErrorMessage('Wrong primary pin');
            setIsShaking(true);

            setTimeout(() => {
              setIsShaking(false);
              setPrimaryPin('');
              setSecondaryPin('');
              setErrorMessage('Wrong primary pin');
              setScreen('primary_pin');
            }, 550);
          }
        }
      }
    }
  };

  const handleKeypadBackspace = (isSecondary: boolean = false) => {
    if (isShaking) return;
    if (!isSecondary) {
      setPrimaryPin(prev => prev.slice(0, -1));
    } else {
      setSecondaryPin(prev => prev.slice(0, -1));
    }
  };

  const handleStartPinFlow = () => {
    const amount = Number(transaction.amount) || 0;
    if (amount > availableBalance) {
      setAmountError('Insufficient balance for this payment.');
      return;
    }
    setPrimaryPin('');
    setSecondaryPin('');
    setErrorMessage(null);
    setTransaction((prev) => ({
      ...prev,
      transaction_id: 'TXN-UPI-' + Math.floor(100000 + Math.random() * 900000) + '-' + Date.now().toString().slice(-4),
    }));
    setScreen('primary_pin');
    onLogEvent?.('AUTH_FLOW_STARTED', { amount: transaction.amount, receiver: transaction.receiver_id });
  };

  const handleResetFlow = () => {
    setPrimaryPin('');
    setSecondaryPin('');
    setErrorMessage(null);
    setIsShaking(false);
    lastSettledTxnId.current = null;
    setScreen('form');
    onReset();
    onLogEvent?.('SIMULATOR_RESET', { status: 'RESET' });
  };

  const handleTriggerFallback = () => {
    setScreen('fallback');
    onLogEvent?.('FALLBACK_TRIGGERED', { reason: 'NETWORK_TIMEOUT_SIMULATION' });
  };

  // Phone dynamic multi-layered glow styling bound to real-time composite_score
  let phoneBorderClass = 'phone-glow-default';
  if (assessment && (screen === 'result' || screen === 'step2_pin' || screen === 'interstitial')) {
    if (assessment.composite_score <= 40) {
      phoneBorderClass = 'phone-glow-green';
    } else if (assessment.composite_score <= 75) {
      phoneBorderClass = 'phone-glow-amber';
    } else {
      phoneBorderClass = 'phone-glow-crimson';
    }
  }

  const getInterstitialReasonSummary = (reasonCodes: string[]): string => {
    const codeMap: Record<string, string> = {
      'HIGH_ANOMALY': 'an unusual amount',
      'UNUSUAL_AMOUNT_SURGE': 'an unusual amount',
      'UNUSUAL_AMOUNT': 'an unusual amount',
      'NEW_RECEIVER': 'a new receiver',
      'SUSPICIOUS_RECEIVER': 'an unfamiliar receiver',
      'BEHAVIORAL_DEVIATION': 'device & behavioral variations',
      'EMULATOR_DEVICE_DETECTED': 'an unverified device environment',
      'HIGH_TRANSACTION_VELOCITY': 'high transaction frequency'
    };

    const detected = reasonCodes
      .map(c => codeMap[c])
      .filter((v, i, a): v is string => Boolean(v) && a.indexOf(v) === i);

    if (detected.length === 0) {
      return 'elevated anomaly signals';
    }
    if (detected.length === 1) {
      return detected[0];
    }
    if (detected.length === 2) {
      return `${detected[0]} and ${detected[1]}`;
    }
    return `${detected[0]}, ${detected[1]}, and other security signals`;
  };

  const getReasonCodeExplanation = (code: string) => {
    switch (code) {
      case 'HIGH_ANOMALY':
        return 'Isolation Forest anomaly detection scored transaction features >60 standard deviations from user baseline.';
      case 'HIGH_TRANSACTION_VELOCITY':
        return 'Multiple transaction attempts detected within a rapid 120-second rolling window.';
      case 'SUSPICIOUS_RECEIVER':
        return 'Receiver VPA has zero prior history with this sender or was registered <24 hours ago.';
      case 'BEHAVIORAL_DEVIATION':
        return 'Keystroke timing rhythm and gyroscope posture deviate significantly from natural human motor variance.';
      case 'UNUSUAL_AMOUNT_SURGE':
        return 'Amount is >3x higher than typical 90-day average transaction ticket sizes.';
      case 'EMULATOR_DEVICE_DETECTED':
        return 'Hardware fingerprint detected rooted x86 emulator environment with synthetic sensors.';
      default:
        return 'Signal evaluated by SentinelAI real-time Zero-Trust policy engine.';
    }
  };

  return (
    <div className="flex flex-col items-center">
      
      {/* Smartphone Device Frame */}
      <div 
        className={`relative w-[360px] sm:w-[380px] h-[720px] rounded-[48px] bg-[var(--phone-bg)] border-[6px] transition-all duration-300 overflow-hidden flex flex-col justify-between select-none ${phoneBorderClass}`}
      >
        
        {/* Status Bar */}
        <div 
          className="w-full px-6 pt-3.5 pb-1 flex items-center justify-between text-xs font-mono z-30 border-b"
          style={{
            backgroundColor: 'var(--phone-header)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-primary)'
          }}
        >
          <span className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>9:41</span>
          
          {/* Dynamic Island */}
          <div 
            className="w-24 h-4 rounded-full flex items-center justify-center gap-1.5 px-2 shadow-inner"
            style={{ backgroundColor: 'var(--text-primary)' }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary-light)' }}></span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--primary)' }}></span>
          </div>

          <div className="flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
            <Wifi className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
            <Battery className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          </div>
        </div>

        {/* ========================================================= */}
        {/* SCREEN 1: TRANSACTION SETUP FORM */}
        {/* ========================================================= */}
        {screen === 'form' && (
          <div className="flex-1 flex flex-col justify-between p-5 overflow-y-auto bg-[var(--phone-bg)]">
            <div className="space-y-4">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black font-mono shadow-sm border"
                    style={{
                      backgroundColor: 'var(--phone-card)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--primary)'
                    }}
                  >
                    UPI
                  </div>
                  <div>
                    <h3 className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>UPI BharatPay</h3>
                    <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>NPCI Certified Interface</p>
                  </div>
                </div>
                <button 
                  onClick={handleTriggerFallback}
                  title="Simulate network exception fallback"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] transition border"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <RefreshCw className="w-3 h-3" style={{ color: 'var(--primary)' }} />
                  <span>Test Fallback</span>
                </button>
              </div>

              {/* Paying To (Receiver) Card */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: 'var(--text-primary)' }}>
                    PAYING TO (RECEIVER)
                  </label>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--primary)' }}>
                    NPCI VPA Route
                  </span>
                </div>

                <div 
                  className="p-3.5 rounded-2xl flex items-center justify-between shadow-sm border"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)'
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-sm"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      {selectedPayee.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate max-w-[150px]" style={{ color: 'var(--text-primary)' }}>
                          {selectedPayee.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono truncate block" style={{ color: 'var(--text-secondary)' }}>
                        {selectedPayee.vpa}
                      </span>
                    </div>
                  </div>

                  <span 
                    className="text-xs font-bold flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border shadow-sm"
                    style={{
                      borderColor: 'var(--border-default)',
                      color: 'var(--primary)'
                    }}
                  >
                    <Sparkles className="w-3 h-3" style={{ color: 'var(--primary)' }} />
                    Active
                  </span>
                </div>
              </div>

              {/* Quick Select Payees (Clean Anti-Gaming) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: 'var(--text-primary)' }}>
                    QUICK SELECT PAYEES:
                  </label>
                  <span className="text-[9px] font-mono" style={{ color: 'var(--text-secondary)' }}>Unbiased Selection</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {PRESET_PAYEES.map((payee) => {
                    const isSelected = selectedPayee.id === payee.id;
                    return (
                      <button
                        key={payee.id}
                        type="button"
                        onClick={() => handleSelectPayee(payee)}
                        className={`text-left p-2.5 rounded-xl border text-xs transition-all duration-200 ${
                          isSelected
                            ? 'shadow-sm font-bold ring-2'
                            : 'bg-white hover:opacity-90'
                        }`}
                        style={{
                          backgroundColor: isSelected ? 'var(--phone-card)' : 'var(--bg-surface)',
                          borderColor: isSelected ? 'var(--primary)' : 'var(--border-default)',
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                      >
                        <div className="font-semibold truncate text-[11px]" style={{ color: 'var(--text-primary)' }}>
                          {payee.name}
                        </div>
                        <span className="text-[10px] font-mono block mt-0.5 font-bold" style={{ color: 'var(--primary)' }}>
                          ₹{payee.defaultAmount.toLocaleString('en-IN')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Enter Amount */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider font-bold block" style={{ color: 'var(--text-primary)' }}>
                    ENTER AMOUNT
                  </label>
                  <span className="text-[10px] font-mono font-semibold" style={{ color: amountError ? '#e11d48' : 'var(--text-secondary)' }}>
                    Max: ₹1,00,000 / tx
                  </span>
                </div>
                <div className="relative">
                  <div 
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-bold text-lg font-mono"
                    style={{ color: amountError ? '#e11d48' : 'var(--primary)' }}
                  >
                    ₹
                  </div>
                  <input
                    type="text"
                    value={customAmount}
                    onChange={handleCustomAmountInput}
                    className={`w-full pl-9 pr-4 py-3 rounded-2xl font-mono text-xl font-bold focus:outline-none transition shadow-inner border ${
                      amountError ? 'border-rose-500 bg-rose-50/40 text-rose-900' : ''
                    }`}
                    style={{
                      backgroundColor: amountError ? undefined : 'var(--phone-card)',
                      borderColor: amountError ? undefined : 'var(--border-default)',
                      color: amountError ? undefined : 'var(--text-primary)'
                    }}
                    placeholder="0"
                  />
                </div>

                {/* Inline Error State */}
                {amountError && (
                  <div className="mt-1.5 flex items-start gap-1.5 p-2 rounded-xl text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-600" />
                    <span>{amountError}</span>
                  </div>
                )}

                {/* Amount Pills */}
                <div className="flex items-center gap-2 mt-2">
                  {PRESET_AMOUNTS.map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleAmountChange(amt)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition border shadow-sm"
                      style={{
                        backgroundColor: transaction.amount === amt && !amountError ? 'var(--primary)' : 'var(--bg-surface)',
                        color: transaction.amount === amt && !amountError ? 'var(--text-on-primary)' : 'var(--text-primary)',
                        borderColor: transaction.amount === amt && !amountError ? 'var(--primary)' : 'var(--border-default)'
                      }}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>

                <div 
                  className="mt-2.5 p-2 rounded-xl text-[11px] border"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>Note: </span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{transaction.note}</span>
                </div>
              </div>

              {/* Account Card */}
              <div 
                className="p-2.5 rounded-xl flex items-center justify-between text-xs border"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold text-white font-mono"
                    style={{ backgroundColor: 'var(--primary)' }}
                  >
                    HDFC
                  </div>
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>HDFC Bank •••• {ACCOUNT_LAST4}</span>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                      Available Balance: ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--primary)' }}>Verified</span>
              </div>

            </div>

            {/* Pay CTA */}
            <div className="pt-4">
              {(() => {
                const isAmountInvalid = !transaction.amount || transaction.amount <= 0 || transaction.amount > 100000 || isNaN(Number(transaction.amount)) || !!amountError || transaction.amount > availableBalance;
                return (
                  <button
                    type="button"
                    disabled={isAmountInvalid}
                    onClick={handleStartPinFlow}
                    className={`w-full py-3.5 px-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all transform ${
                      isAmountInvalid 
                        ? 'opacity-40 cursor-not-allowed pointer-events-none' 
                        : 'active:scale-[0.98]'
                    }`}
                    style={{ backgroundColor: 'var(--primary)' }}
                  >
                    <Lock className="w-4 h-4 text-white" />
                    <span>Pay ₹{(Number(transaction.amount) || 0).toLocaleString('en-IN')} Securely</span>
                  </button>
                );
              })()}
              <p className="text-center text-[10px] mt-2 flex items-center justify-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <ShieldCheck className="w-3 h-3" style={{ color: 'var(--primary)' }} />
                <span>Protected by SentinelAI Interception Engine</span>
              </p>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 2: STEP 1 - PRIMARY PIN ENTRY */}
        {/* ========================================================= */}
        {screen === 'primary_pin' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-[var(--phone-bg)]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setScreen('form')}
                  className="p-1.5 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>Step 1: Enter Primary PIN</span>
                <div className="w-6"></div>
              </div>

              <div className="text-center mt-2">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Transferring to</p>
                <h4 className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{transaction.receiver_name}</h4>
                <div className="text-2xl font-extrabold font-mono mt-1" style={{ color: 'var(--primary)' }}>
                  ₹{transaction.amount.toLocaleString('en-IN')}
                </div>
              </div>

              {/* PIN Dots Container */}
              <div className={`flex items-center justify-center gap-4 my-6 ${isShaking ? 'animate-shake' : ''}`}>
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 border ${
                      primaryPin.length > idx ? 'scale-125 shadow-md' : ''
                    }`}
                    style={{
                      backgroundColor: primaryPin.length > idx ? 'var(--primary)' : 'var(--phone-card)',
                      borderColor: primaryPin.length > idx ? 'var(--primary)' : 'var(--border-default)'
                    }}
                  />
                ))}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-rose-700 font-bold bg-rose-50 border border-rose-300 rounded-xl py-1.5 px-3 mb-2 animate-pulse">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <p className="text-center text-[11px] font-mono uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
                ENTER 4-DIGIT PRIMARY UPI PIN
              </p>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto w-full mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num, false)}
                  className="h-14 rounded-2xl font-mono text-xl font-bold border transition flex items-center justify-center shadow-sm hover:opacity-90 active:scale-95"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setPrimaryPin('1337');
                  setTimeout(() => onExecuteTransaction(transaction), 150);
                }}
                className="h-14 rounded-2xl font-mono text-xs font-semibold border transition flex flex-col items-center justify-center"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--primary)'
                }}
              >
                <Fingerprint className="w-5 h-5" />
                <span className="text-[9px] font-bold">TouchID</span>
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0', false)}
                className="h-14 rounded-2xl font-mono text-xl font-bold border transition flex items-center justify-center shadow-sm hover:opacity-90 active:scale-95"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeypadBackspace(false)}
                className="h-14 rounded-2xl font-mono text-sm border transition flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-secondary)'
                }}
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 3: PIPELINE ANIMATION */}
        {/* ========================================================= */}
        {screen === 'pipeline' && (
          <div className="flex-1 flex flex-col justify-between p-5 bg-[var(--phone-bg)]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: 'var(--primary)' }}></div>
                  <span className="text-xs font-mono font-bold uppercase" style={{ color: 'var(--text-primary)' }}>
                    SENTINEL INTERCEPTOR
                  </span>
                </div>
                <span 
                  className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--primary)'
                  }}
                >
                  REAL-TIME IN-FLIGHT
                </span>
              </div>

              <div 
                className="my-3 p-3 rounded-xl border flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <div>
                  <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                    ₹{transaction.amount.toLocaleString('en-IN')} → {transaction.receiver_name}
                  </span>
                  <span className="text-[10px] font-mono block" style={{ color: 'var(--text-secondary)' }}>
                    {transaction.receiver_id}
                  </span>
                </div>
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)'
                  }}
                >
                  VPA_INTENT
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[11px] font-mono mb-1" style={{ color: 'var(--text-secondary)' }}>
                  <span>PIPELINE PROGRESS</span>
                  <span className="font-bold" style={{ color: 'var(--primary)' }}>
                    {Math.min(100, Math.round((pipelineStep / 5) * 100))}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
                  <div 
                    className="h-full transition-all duration-150"
                    style={{ 
                      width: `${Math.min(100, (pipelineStep / 5) * 100)}%`,
                      backgroundColor: 'var(--primary)'
                    }}
                  ></div>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2 text-xs font-mono">
                {['1. Ingress Ingestion (0.8ms)', '2. Behavioral Biometrics (~3ms)', '3. Anomaly & Velocity (~12ms)', '4. Isolation Forest ML (~14ms)', '5. Zero-Trust Policy Matrix (~3ms)'].map((stepTitle, idx) => (
                  <div 
                    key={idx}
                    className="p-2.5 rounded-xl border transition-all"
                    style={{
                      backgroundColor: pipelineStep >= (idx + 1) ? 'var(--phone-card)' : 'var(--bg-surface)',
                      borderColor: pipelineStep >= (idx + 1) ? 'var(--primary)' : 'var(--border-default)',
                      color: pipelineStep >= (idx + 1) ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{stepTitle.split(' (')[0]}</span>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>{stepTitle.split(' (')[1]?.replace(')', '')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t text-center text-[10px] font-mono" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
              Evaluating sub-millisecond risk profile...
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* INTERSTITIAL STEP: 2-LINE REASON CODE SECURITY POPUP */}
        {/* ========================================================= */}
        {screen === 'interstitial' && assessment && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-[var(--phone-bg)] animate-scale-up">
            <div className="my-auto space-y-4">
              
              {/* Shield / Warning Icon */}
              <div 
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border shadow-sm ${
                  assessment.composite_score > 75 
                    ? 'bg-red-50 border-red-300 text-red-600' 
                    : 'bg-amber-50 border-amber-300 text-amber-600'
                }`}
              >
                {assessment.composite_score > 75 ? (
                  <ShieldAlert className="w-8 h-8 animate-bounce" />
                ) : (
                  <AlertTriangle className="w-8 h-8" />
                )}
              </div>

              {/* Title & Risk Badge */}
              <div className="text-center space-y-1">
                <span 
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    assessment.composite_score > 75 
                      ? 'bg-red-100 text-red-800 border border-red-300' 
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {assessment.composite_score > 75 ? 'HIGH RISK INTERCEPTION' : 'SECURITY STEP-UP REQUIRED'}
                </span>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Security Verification Prompt
                </h3>
              </div>

              {/* Strict 2-Line Interstitial Text Block */}
              <div 
                className={`p-4 rounded-2xl border text-xs leading-relaxed text-center space-y-1.5 shadow-sm ${
                  assessment.composite_score > 75 
                    ? 'bg-red-50/70 border-red-300 text-red-950' 
                    : 'bg-amber-50/70 border-amber-300 text-amber-950'
                }`}
              >
                <p className="font-semibold">
                  Security Check: We detected {getInterstitialReasonSummary(assessment.reason_codes)}.
                </p>
                <p className="opacity-90">
                  Please enter your secondary PIN to authorize this transaction under your liability.
                </p>
              </div>

              {/* Transaction Context Pill */}
              <div 
                className="p-2.5 rounded-xl border text-[11px] font-mono flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-secondary)'
                }}
              >
                <span>Amount: <strong style={{ color: 'var(--text-primary)' }}>₹{transaction.amount.toLocaleString('en-IN')}</strong></span>
                <span>Receiver: <strong style={{ color: 'var(--primary)' }}>{transaction.receiver_name || transaction.receiver_id}</strong></span>
              </div>

              {/* Collapsible SHAP Feature Attribution Breakdown (Hidden by default, expands on View click) */}
              {showShapDetails && (
                <div 
                  className="space-y-2 p-3 rounded-2xl border text-left animate-fadeIn max-h-[200px] overflow-y-auto transition-all"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)'
                  }}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold border-b pb-1.5" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" style={{ color: 'var(--primary)' }} />
                      SHAP FEATURE ATTRIBUTION
                    </span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                      SCORE: {assessment.composite_score}/100
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[10px]">
                    {generateSHAPFeatures(assessment, transaction).map((feat, idx) => (
                      <div 
                        key={idx} 
                        className="p-2 rounded-xl bg-white border space-y-1 shadow-xs"
                        style={{ borderColor: 'var(--border-default)' }}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="truncate max-w-[170px]" style={{ color: 'var(--text-primary)' }}>{feat.name}</span>
                          <span className={`font-mono px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            feat.is_positive_risk ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {feat.impact_score > 0 ? `+${feat.impact_score}` : feat.impact_score} pts
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                          <span className="truncate max-w-[140px]">{feat.raw_value}</span>
                          <span className="font-semibold">Weight: {feat.weight_percentage}%</span>
                        </div>
                        <p className="text-[9px] leading-tight" style={{ color: 'var(--text-secondary)' }}>{feat.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Actions: Report Button & Side-by-Side View / Continue CTAs */}
            <div className="pt-2 space-y-2">
              <ReportReceiverButton
                currentUserId={transaction.user_id}
                senderId={transaction.user_id}
                receiverId={transaction.receiver_id}
                receiverName={transaction.receiver_name}
                riskAssessment={assessment}
                transactionContext={{
                  transaction_id: assessment.transaction_id || transaction.transaction_id,
                  amount: transaction.amount,
                  currency: transaction.currency,
                  device_id: transaction.device_id,
                  note: transaction.note
                }}
                apiBaseUrl={BACKEND_BASE_URL}
                onReportSubmitted={(repId) => onLogEvent?.('FRAUD_REPORT_SUBMITTED', { report_id: repId })}
              />

              {/* Side-by-Side Layout: 50% "View" Button + CSS Gap + 50% "Continue" Button */}
              <div className="flex items-center gap-2.5 w-full">
                {/* 1. View Button (50% Width) */}
                <button
                  type="button"
                  onClick={() => setShowShapDetails(prev => !prev)}
                  className="flex-1 py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all shadow-sm active:scale-[0.98]"
                  style={{
                    backgroundColor: showShapDetails ? 'var(--primary)' : 'var(--phone-card)',
                    borderColor: showShapDetails ? 'var(--primary)' : 'var(--border-default)',
                    color: showShapDetails ? 'var(--text-on-primary)' : 'var(--text-primary)'
                  }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showShapDetails ? 'Hide' : 'View'}</span>
                </button>

                {/* 2. Continue Button (50% Width) */}
                <button
                  type="button"
                  onClick={() => setScreen('step2_pin')}
                  className="flex-1 py-3 px-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: assessment.composite_score > 75 ? '#DC2626' : 'var(--primary)'
                  }}
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 4: STEP 2 - SECONDARY PIN */}
        {/* ========================================================= */}
        {screen === 'step2_pin' && assessment && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-[var(--phone-bg)]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setScreen('form')}
                  className="p-1.5 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  assessment.composite_score > 75 
                    ? 'bg-red-50 text-red-700 border border-red-300' 
                    : 'bg-amber-50 text-amber-800 border border-amber-300'
                }`}>
                  {assessment.composite_score > 75 ? 'USER RISK OVERRIDE AUTH' : 'STEP 2: SECONDARY VERIFICATION'}
                </span>
                <div className="w-6"></div>
              </div>

              {assessment.composite_score <= 75 ? (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 mb-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-900 font-bold mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Secondary PIN Confirmation Required</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Elevated risk score ({assessment.composite_score}/100). Re-enter your PIN to authorize immediate irreversible payment to <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{transaction.receiver_name}</span>.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-red-50 border-2 border-red-400 mb-3 text-xs">
                  <div className="flex items-center gap-2 text-red-900 font-bold mb-1">
                    <ShieldAlert className="w-4 h-4 text-red-600 animate-bounce flex-shrink-0" />
                    <span>CRITICAL RISK - USER LIABILITY OVERRIDE</span>
                  </div>
                  <p className="text-[11px] text-red-800 leading-relaxed">
                    High anomaly score ({assessment.composite_score}/100). Re-entering your secondary PIN authorizes immediate payment without system holds.
                  </p>
                </div>
              )}

              <div className="text-center">
                <p className="text-[11px] font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>RE-ENTER SECONDARY PIN</p>
                
                <div className={`flex items-center justify-center gap-4 my-3.5 ${isShaking ? 'animate-shake' : ''}`}>
                  {[0, 1, 2, 3].map(idx => (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 border ${
                        secondaryPin.length > idx ? (assessment.composite_score > 75 ? 'bg-red-500 scale-125' : 'bg-amber-500 scale-125') : ''
                      }`}
                      style={{
                        backgroundColor: secondaryPin.length > idx ? undefined : 'var(--phone-card)',
                        borderColor: secondaryPin.length > idx ? undefined : 'var(--border-default)'
                      }}
                    />
                  ))}
                </div>

                {errorMessage && (
                  <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-rose-700 font-bold bg-rose-50 border border-rose-300 rounded-xl py-1 px-3 mb-2 animate-pulse">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto w-full mb-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num, true)}
                  className="h-12 rounded-2xl font-mono text-lg font-bold border transition flex items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  handleKeypadPress('1', true);
                  setTimeout(() => handleKeypadPress('3', true), 80);
                  setTimeout(() => handleKeypadPress('3', true), 160);
                  setTimeout(() => handleKeypadPress('7', true), 240);
                }}
                className="h-12 rounded-2xl font-mono text-xs font-semibold border transition flex flex-col items-center justify-center"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--primary)'
                }}
              >
                <Fingerprint className="w-4 h-4" />
                <span className="text-[8px] font-bold">Biometric</span>
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0', true)}
                className="h-12 rounded-2xl font-mono text-lg font-bold border transition flex items-center justify-center shadow-sm"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeypadBackspace(true)}
                className="h-12 rounded-2xl font-mono text-sm border transition flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-secondary)'
                }}
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 5: FINAL RESULT */}
        {/* ========================================================= */}
        {screen === 'result' && assessment && (
          <div className="flex-1 flex flex-col justify-between p-5 overflow-y-auto bg-[var(--phone-bg)]">
            <div className="space-y-3.5">
              
              {/* Payment Successful Card */}
              <div 
                className="text-center py-4 px-3 rounded-2xl border shadow-sm transition-all"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <div 
                  className="w-14 h-14 rounded-full border-2 flex items-center justify-center mx-auto mb-2 shadow-sm bg-white"
                  style={{
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)'
                  }}
                >
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                
                <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Payment Successful</h3>
                
                <div className="text-2xl font-black font-mono mt-0.5" style={{ color: 'var(--primary)' }}>
                  ₹{transaction.amount.toLocaleString('en-IN')}
                </div>
                
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Transferred to <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{transaction.receiver_name}</span>
                </p>

                {assessment.composite_score > 40 && (
                  <div className={`inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                    assessment.composite_score > 75 
                      ? 'bg-red-100 text-red-800 border border-red-300' 
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    <span>Dual-PIN User Acknowledged Override</span>
                  </div>
                )}
              </div>

              {/* Reason Codes with Tooltips */}
              <div 
                className="p-3 rounded-xl border"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  <span>ADVANCED REASON CODES</span>
                  <span className="text-[10px] font-normal" style={{ color: 'var(--primary)' }}>Hover/Tap for Details</span>
                </div>

                <div className="space-y-1.5">
                  {assessment.reason_codes.map((code, idx) => (
                    <div key={idx} className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveTooltip(activeTooltip === code ? null : code)}
                        onMouseEnter={() => setActiveTooltip(code)}
                        onMouseLeave={() => setActiveTooltip(null)}
                        className="w-full text-left flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white border text-xs font-mono transition"
                        style={{ borderColor: 'var(--border-default)' }}
                      >
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{code}</span>
                        <HelpCircle className="w-3 h-3" style={{ color: 'var(--primary)' }} />
                      </button>

                      {activeTooltip === code && (
                        <div 
                          className="absolute left-0 right-0 bottom-full mb-1 p-2.5 rounded-xl bg-white border text-[11px] shadow-lg z-50"
                          style={{ borderColor: 'var(--primary)', color: 'var(--text-primary)' }}
                        >
                          <p className="font-sans leading-tight">
                            {getReasonCodeExplanation(code)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadata Footer */}
              <div 
                className="p-2.5 rounded-xl border text-[9px] font-mono space-y-1"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-secondary)'
                }}
              >
                <div className="flex items-center justify-between">
                  <span>Transaction ID:</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{transaction.transaction_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Available Balance:</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* User Reporting Feature (Mounted for High-Risk / Block Flagged Receivers) */}
              <ReportReceiverButton
                currentUserId={transaction.user_id}
                senderId={transaction.user_id}
                receiverId={transaction.receiver_id}
                receiverName={transaction.receiver_name}
                riskAssessment={assessment}
                transactionContext={{
                  transaction_id: assessment.transaction_id || transaction.transaction_id,
                  amount: transaction.amount,
                  currency: transaction.currency,
                  device_id: transaction.device_id,
                  note: transaction.note
                }}
                apiBaseUrl={BACKEND_BASE_URL}
                onReportSubmitted={(repId) => onLogEvent?.('FRAUD_REPORT_SUBMITTED', { report_id: repId })}
              />

            </div>

            {/* Reset CTA */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleResetFlow}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition shadow-sm"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                <span>New UPI Transaction</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 6: FALLBACK STATE */}
        {/* ========================================================= */}
        {screen === 'fallback' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-[var(--phone-bg)] text-center">
            <div className="my-auto">
              <div className="w-16 h-16 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 mx-auto mb-4">
                <Info className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Network Stream Interrupted</h3>
              <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Pre-authorization handshake timed out after 200ms. Transaction safely buffered in local circuit-breaker.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setScreen('form')}
                className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs shadow-md transition"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                Retry Transaction
              </button>
              <button
                onClick={handleResetFlow}
                className="w-full py-2.5 px-4 rounded-xl text-xs transition border"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              >
                Back to Home
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
