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
  Info,
  XCircle,
  ShieldAlert,
  Sparkles,
  Eye,
  Search,
  Check,
  ChevronDown
} from 'lucide-react';
import { Payee, SharedTransaction, RiskAssessment } from '../types/sentinel';
import { PRESET_PAYEES } from '../data/mockData';
import { generateSHAPFeatures } from '../services/riskEngine';
import { ReportReceiverButton } from './ReportReceiverButton';

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

type ScreenType = 'payee_select' | 'amount_entry' | 'pipeline' | 'interstitial' | 'primary_pin' | 'step2_pin' | 'result' | 'fallback';

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
  const [screen, setScreen] = useState<ScreenType>('payee_select');
  const [primaryPin, setPrimaryPin] = useState<string>('');
  const [secondaryPin, setSecondaryPin] = useState<string>('');
  const [selectedPayee, setSelectedPayee] = useState<Payee>(PRESET_PAYEES[0]);
  const [customAmount, setCustomAmount] = useState<string>(transaction.amount.toString());
  const [amountError, setAmountError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showShapDetails, setShowShapDetails] = useState<boolean>(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [selectedPayeeId, setSelectedPayeeId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const lastKeypadPressTime = useRef<number>(0);

  const [accountBalance, setAccountBalance] = useState<number>(() => {
    const saved = localStorage.getItem('sentinel_account_balance');
    return saved ? parseFloat(saved) : 142850.00;
  });

  const deductBalance = (amountToDeduct: number) => {
    setAccountBalance(prev => {
      const updated = Math.max(0, prev - amountToDeduct);
      localStorage.setItem('sentinel_account_balance', updated.toString());
      return updated;
    });
  };

  // Watch pipeline progression from App.tsx
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
        deductBalance(transaction.amount);
        setScreen('result');
      }
    }
  }, [isProcessing, assessment]);

  // Handle Payee selection with smooth micro-interaction
  const handleSelectPayee = (payee: Payee) => {
    setSelectedPayee(payee);
    setSelectedPayeeId(payee.id);
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
    
    // Smooth 180ms transition for a deliberate, fluid user experience
    setTimeout(() => {
      setScreen('amount_entry');
      setSelectedPayeeId(null);
    }, 180);
  };

  // Numpad key input on Screen 2 (Amount Entry)
  const handleAmountKeypadPress = (val: string) => {
    if (val === 'backspace') {
      const nextVal = customAmount.slice(0, -1);
      setCustomAmount(nextVal);
      const num = parseFloat(nextVal) || 0;
      setTransaction(prev => ({ ...prev, amount: num }));
      setAmountError(null);
      return;
    }

    if (val === '.') {
      if (customAmount.includes('.')) return;
      const nextVal = (customAmount || '0') + '.';
      setCustomAmount(nextVal);
      return;
    }

    let nextVal = customAmount === '0' ? val : customAmount + val;
    
    // Max 2 decimals
    const parts = nextVal.split('.');
    if (parts[1] && parts[1].length > 2) {
      nextVal = parts[0] + '.' + parts[1].slice(0, 2);
    }

    const num = parseFloat(nextVal);
    if (isNaN(num)) return;

    if (num > 100000) {
      setAmountError('Transaction limit exceeded: Maximum allowed per UPI is ₹1,00,000.');
      return;
    }

    if (num > accountBalance) {
      setAmountError(`Insufficient funds: Available balance is ₹${accountBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      return;
    }

    setAmountError(null);
    setCustomAmount(nextVal);
    setTransaction(prev => ({ ...prev, amount: num }));
    onLogEvent?.('AMOUNT_KEYPAD_INPUT', { amount: num });
  };

  // Connect Physical Keyboard Access (0-9, Backspace, Enter, .)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when focusing on the search input
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        return;
      }

      if (screen === 'amount_entry') {
        if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
          e.preventDefault();
          handleAmountKeypadPress(e.key);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          handleAmountKeypadPress('backspace');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const amt = parseFloat(customAmount);
          if (amt > 0 && amt <= 100000 && amt <= accountBalance && !amountError) {
            setScreen('primary_pin');
          }
        }
      } else if (screen === 'primary_pin') {
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault();
          handlePinKeypadPress(e.key, false);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          handlePinBackspace(false);
        }
      } else if (screen === 'step2_pin') {
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault();
          handlePinKeypadPress(e.key, true);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          handlePinBackspace(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, customAmount, primaryPin, secondaryPin, amountError, accountBalance]);

  // PIN Keypad inputs
  const handlePinKeypadPress = (digit: string, isSecondary: boolean = false) => {
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
          }, 250);
        }
      }
    } else {
      if (secondaryPin.length < 4) {
        const nextPin = secondaryPin + digit;
        setSecondaryPin(nextPin);
        setErrorMessage(null);

        if (nextPin.length === 4) {
          if (nextPin === '1337' || nextPin === '4092' || nextPin === '9999' || nextPin.length === 4) {
            onLogEvent?.('SECONDARY_PIN_VERIFIED', { success: true, timestamp: new Date().toISOString() });
            deductBalance(transaction.amount);
            setScreen('result');
          } else {
            setIsShaking(true);
            setErrorMessage('Invalid Secondary Security PIN. Try 1337');
            onLogEvent?.('SECONDARY_PIN_FAILED', { error: 'AUTH_FAILED' });
            setTimeout(() => {
              setIsShaking(false);
              setSecondaryPin('');
            }, 500);
          }
        }
      }
    }
  };

  const handlePinBackspace = (isSecondary: boolean = false) => {
    if (!isSecondary) {
      setPrimaryPin(prev => prev.slice(0, -1));
    } else {
      setSecondaryPin(prev => prev.slice(0, -1));
    }
    setErrorMessage(null);
  };

  const handleResetFlow = () => {
    setScreen('payee_select');
    setPrimaryPin('');
    setSecondaryPin('');
    setShowShapDetails(false);
    setAmountError(null);
    setErrorMessage(null);
    onReset();
  };

  // Filter contacts by search query
  const filteredPayees = PRESET_PAYEES.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.vpa.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic state-driven multi-layered glowing border
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
      'HIGH_ANOMALY': 'an unusual amount surge',
      'UNUSUAL_AMOUNT_SURGE': 'an unusual amount surge',
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

    if (detected.length === 0) return 'elevated anomaly signals';
    if (detected.length === 1) return detected[0];
    if (detected.length === 2) return `${detected[0]} and ${detected[1]}`;
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

  const isAmountInvalid = !transaction.amount || transaction.amount <= 0 || transaction.amount > 100000 || transaction.amount > accountBalance || isNaN(Number(transaction.amount)) || !!amountError;

  return (
    <div className="flex flex-col items-center">
      
      {/* Smartphone Device Frame (PepperMoney Dark Luxury) */}
      <div 
        className={`relative w-[360px] sm:w-[380px] h-[720px] rounded-[48px] bg-[var(--phone-bg)] border-[6px] transition-all duration-300 overflow-hidden flex flex-col justify-between select-none shadow-2xl ${phoneBorderClass}`}
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
          <span className="font-bold text-[13px]">9:41</span>
          
          {/* Dynamic Island */}
          <div 
            className="w-24 h-4 rounded-full flex items-center justify-center gap-1.5 px-2 bg-[#09090B] shadow-inner border border-white/5"
          >
            <span className="w-2 h-2 rounded-full animate-pulse bg-rose-500"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          </div>

          <div className="flex items-center gap-1.5 text-white/80">
            <Wifi className="w-3.5 h-3.5 text-rose-500" />
            <Battery className="w-4 h-4 text-rose-500" />
          </div>
        </div>

        {/* ========================================================= */}
        {/* SCREEN 1: PAYEE DIRECTORY & CONTACTS SELECTION */}
        {/* ========================================================= */}
        {screen === 'payee_select' && (
          <div className="flex-1 flex flex-col justify-between p-5 overflow-y-auto bg-[var(--phone-bg)] animate-fadeIn">
            <div className="space-y-4">
              
              {/* Top Header */}
              <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 to-rose-900 flex items-center justify-center text-xs font-black text-white shadow-sm">
                    P
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">Send Money</h3>
                    <p className="text-[10px] text-gray-400 font-mono">UPI BharatPay Direct</p>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pay by name, UPI ID, or phone"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl text-xs bg-[var(--phone-card)] border border-[var(--border-default)] text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition shadow-inner font-sans"
                />
              </div>

              {/* Vertical Recent Recipients List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-gray-400">
                    RECENT RECIPIENTS
                  </span>
                  <span className="text-[9px] font-mono text-rose-400">Instant Pay</span>
                </div>

                <div className="space-y-2">
                  {filteredPayees.map((payee, idx) => {
                    const isSelected = selectedPayeeId === payee.id || selectedPayee.id === payee.id;
                    const avatarGradients = [
                      'bg-gradient-to-br from-indigo-600 to-violet-800 border-indigo-500/30',
                      'bg-gradient-to-br from-teal-600 to-emerald-800 border-teal-500/30',
                      'bg-gradient-to-br from-purple-600 to-pink-800 border-purple-500/30',
                      'bg-gradient-to-br from-blue-600 to-cyan-800 border-blue-500/30',
                      'bg-gradient-to-br from-fuchsia-600 to-rose-800 border-fuchsia-500/30',
                    ];
                    const avatarBg = avatarGradients[idx % avatarGradients.length];

                    return (
                      <button
                        key={payee.id}
                        type="button"
                        onClick={() => handleSelectPayee(payee)}
                        className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all duration-200 text-left group ${
                          isSelected
                            ? 'border-rose-500 bg-rose-950/40 scale-[0.99] shadow-lg shadow-rose-950/30'
                            : 'border-[var(--border-default)] bg-[var(--phone-card)] hover:border-rose-500/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-sm border transition ${avatarBg}`}>
                            {payee.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">
                                {payee.name}
                              </span>
                              {payee.verified && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-gray-400 truncate block">
                              {payee.vpa}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-mono font-bold text-rose-400 block">
                            ₹{payee.defaultAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            <p className="text-center text-[10px] text-gray-500 font-mono mt-3">
              Protected by SentinelAI Real-Time Zero-Trust Engine
            </p>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 2: AMOUNT ENTRY & KEYPAD (PEPPERMONEY STYLE) */}
        {/* ========================================================= */}
        {screen === 'amount_entry' && (
          <div className="flex-1 flex flex-col justify-between p-5 bg-[var(--phone-bg)] animate-fadeIn">
            <div>
              {/* Header with Back button */}
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <button
                  onClick={() => setScreen('payee_select')}
                  className="p-1.5 rounded-xl border text-gray-300 hover:text-white transition"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)'
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono font-semibold text-gray-400">Transfer Amount</span>

                <div className="w-7 h-7 rounded-xl bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-[10px] font-mono font-bold text-rose-400">
                  ₹
                </div>
              </div>

              {/* Recipient Profile Card */}
              <div className="flex flex-col items-center text-center mt-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-red-900 border-2 border-rose-500/50 flex items-center justify-center font-bold text-base text-white shadow-md mb-1.5">
                  {selectedPayee.initials}
                </div>
                <h4 className="text-sm font-bold text-white">{selectedPayee.name}</h4>
                <p className="text-[11px] font-mono text-gray-400">{selectedPayee.vpa}</p>
              </div>

              {/* Giant Amount Input Display */}
              <div className="p-3 rounded-2xl border text-center my-2 relative" style={{ backgroundColor: 'var(--phone-card)', borderColor: amountError ? '#EF4444' : 'var(--border-default)' }}>
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-0.5">
                  Enter amount
                </span>
                
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-bold font-mono text-rose-500">₹</span>
                  <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                    {customAmount || '0'}
                  </span>
                  <span className="w-0.5 h-7 bg-rose-500 animate-pulse ml-0.5 inline-block"></span>
                </div>

                {amountError && (
                  <p className="text-[10px] text-red-400 mt-1.5 font-mono animate-pulse">
                    {amountError}
                  </p>
                )}
              </div>

              {/* Pay Using Bank Card Selector */}
              <div 
                className="p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer hover:border-rose-500 transition mb-3"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-[10px] flex items-center justify-center font-mono">
                    H
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-white block leading-tight">
                      HDFC Bank •••• 4092
                    </span>
                    <span className="text-[9px] font-mono text-gray-400">
                      Balance: ₹{accountBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono text-rose-400 font-bold">
                  <span>Active</span>
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>

              {/* Primary Pay CTA */}
              <button
                type="button"
                disabled={isAmountInvalid}
                onClick={() => setScreen('primary_pin')}
                className={`w-full py-3 px-4 rounded-2xl text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all transform ${
                  isAmountInvalid
                    ? 'opacity-40 cursor-not-allowed pointer-events-none bg-gray-700' 
                    : 'bg-rose-600 hover:bg-rose-500 active:scale-[0.98]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Pay ₹{(Number(transaction.amount) || 0).toLocaleString('en-IN')} Now</span>
              </button>
            </div>

            {/* Custom Numeric Keypad (PepperMoney Style) */}
            <div className="grid grid-cols-3 gap-1.5 max-w-[280px] mx-auto w-full pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleAmountKeypadPress(num)}
                  className="h-10 rounded-xl font-mono text-lg font-bold border transition flex items-center justify-center bg-[var(--phone-card)] border-[var(--border-default)] text-white hover:bg-rose-950/40 active:scale-95 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleAmountKeypadPress('.')}
                className="h-10 rounded-xl font-mono text-lg font-bold border transition flex items-center justify-center bg-[var(--phone-card)] border-[var(--border-default)] text-gray-400 hover:text-white"
              >
                .
              </button>
              <button
                type="button"
                onClick={() => handleAmountKeypadPress('0')}
                className="h-10 rounded-xl font-mono text-lg font-bold border transition flex items-center justify-center bg-[var(--phone-card)] border-[var(--border-default)] text-white hover:bg-rose-950/40 active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleAmountKeypadPress('backspace')}
                className="h-10 rounded-xl font-mono text-sm border transition flex items-center justify-center bg-[var(--phone-card)] border-[var(--border-default)] text-gray-400 hover:text-rose-400"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 3: STEP 1 - PRIMARY PIN */}
        {/* ========================================================= */}
        {screen === 'primary_pin' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-[var(--phone-bg)] animate-fadeIn">
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setScreen('amount_entry')}
                  className="p-1.5 rounded-xl border text-gray-300 hover:text-white transition"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)'
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-semibold text-gray-400">Step 1: Primary PIN</span>
                <div className="w-6"></div>
              </div>

              <div className="text-center mt-2">
                <p className="text-xs text-gray-400">Transferring to</p>
                <h4 className="text-sm font-bold text-white mt-0.5">{transaction.receiver_name}</h4>
                <div className="text-2xl font-extrabold font-mono mt-1 text-rose-500">
                  ₹{transaction.amount.toLocaleString('en-IN')}
                </div>
              </div>

              {/* PIN Dots */}
              <div className={`flex items-center justify-center gap-4 my-6 ${isShaking ? 'animate-shake' : ''}`}>
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 border ${
                      primaryPin.length > idx ? 'bg-rose-500 scale-125 shadow-md border-rose-400' : 'bg-[var(--phone-card)] border-[var(--border-default)]'
                    }`}
                  />
                ))}
              </div>

              {errorMessage && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-rose-300 font-bold bg-rose-950/60 border border-rose-800 rounded-xl py-1.5 px-3 mb-2 animate-pulse">
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <p className="text-center text-[11px] font-mono uppercase tracking-wider font-semibold text-gray-400">
                ENTER 4-DIGIT PRIMARY UPI PIN
              </p>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto w-full mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinKeypadPress(num, false)}
                  className="h-12 rounded-2xl font-mono text-lg font-bold border transition flex items-center justify-center bg-[var(--phone-card)] border-[var(--border-default)] text-white hover:bg-rose-950/30 active:scale-95 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <div className="h-12"></div>
              <button
                type="button"
                onClick={() => handlePinKeypadPress('0', false)}
                className="h-12 rounded-2xl font-mono text-lg font-bold border transition flex items-center justify-center bg-[var(--phone-card)] border-[var(--border-default)] text-white hover:bg-rose-950/30 active:scale-95 shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handlePinBackspace(false)}
                className="h-12 rounded-2xl font-mono text-sm border transition flex items-center justify-center bg-[var(--phone-card)] border-[var(--border-default)] text-gray-400 hover:text-rose-400"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN: PIPELINE EVALUATION (PRE-AUTH RADAR SCAN) */}
        {/* ========================================================= */}
        {screen === 'pipeline' && (
          <div className="flex-1 flex flex-col justify-center items-center p-6 text-center space-y-6 bg-[var(--phone-bg)] animate-fadeIn">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-rose-500/20 flex items-center justify-center animate-spin">
                <div className="w-20 h-20 rounded-full border-4 border-t-rose-500 border-r-transparent border-b-transparent border-l-transparent"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-rose-500 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Zero-Trust Pipeline Active</h3>
              <p className="text-xs text-gray-400 font-mono">
                Running sub-millisecond behavioral anomaly extraction...
              </p>
            </div>

            {/* Pipeline Stage Indicators */}
            <div className="w-full max-w-xs space-y-2">
              {[
                { label: 'Feature Extraction & Baseline', step: 1 },
                { label: 'Isolation Forest Anomaly Scoring', step: 2 },
                { label: 'Velocity & Receiver Rules', step: 3 },
                { label: 'Normalized Risk Fusion & Policy', step: 4 },
              ].map(item => {
                const isPassed = pipelineStep > item.step;
                const isCurrent = pipelineStep === item.step;
                return (
                  <div 
                    key={item.step} 
                    className={`flex items-center justify-between p-2 rounded-xl text-[11px] font-mono border transition-all ${
                      isPassed 
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
                        : isCurrent
                        ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 animate-pulse'
                        : 'bg-black/30 border-white/5 text-gray-500'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span>{isPassed ? <Check className="w-3 h-3 text-emerald-400" /> : isCurrent ? '•••' : '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN: INTERSTITIAL SECURITY PROMPT (PEPPERMONEY DARK) */}
        {/* ========================================================= */}
        {screen === 'interstitial' && assessment && (
          <div className="flex-1 flex flex-col justify-between p-5 overflow-y-auto bg-[var(--phone-bg)] animate-fadeIn">
            <div className="space-y-3.5">
              
              {/* Navigation Header with Back and Cancel buttons */}
              <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <button
                  type="button"
                  onClick={() => {
                    onLogEvent?.('PAYMENT_CANCELLED_ON_SECURITY_PROMPT', { 
                      amount: transaction.amount,
                      receiver: transaction.receiver_id,
                      score: assessment.composite_score 
                    });
                    handleResetFlow();
                  }}
                  className="p-1.5 rounded-xl border text-gray-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)'
                  }}
                  title="Return to payee selection"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Security Interception</span>
                <button
                  type="button"
                  onClick={handleResetFlow}
                  className="text-[11px] font-mono text-rose-400 hover:text-rose-300 transition"
                >
                  Cancel
                </button>
              </div>

              {/* Warning Icon Badge */}
              <div 
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border shadow-md ${
                  assessment.composite_score > 75 
                    ? 'bg-red-950/60 border-red-800 text-red-400' 
                    : 'bg-amber-950/60 border-amber-800 text-amber-400'
                }`}
              >
                {assessment.composite_score > 75 ? (
                  <ShieldAlert className="w-8 h-8 animate-bounce text-red-500" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                )}
              </div>

              {/* Title & Risk Badge */}
              <div className="text-center space-y-1">
                <span 
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    assessment.composite_score > 75 
                      ? 'bg-red-950 text-red-400 border border-red-800' 
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}
                >
                  {assessment.composite_score > 75 ? 'HIGH RISK INTERCEPTION' : 'SECURITY STEP-UP REQUIRED'}
                </span>
                <h3 className="text-base font-bold text-white">
                  Security Verification Prompt
                </h3>
              </div>

              {/* Security Context Box (Replacing text with toast details & Anomaly Score) */}
              <div 
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed text-left space-y-2 shadow-sm ${
                  assessment.composite_score > 75 
                    ? 'bg-red-950/40 border-red-800/80 text-red-200' 
                    : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <div className="flex items-center gap-1.5 font-bold font-mono text-[10px]">
                    {assessment.composite_score > 75 ? (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <span className="text-red-300">STEP-UP SECURITY</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="text-amber-300">STEP-UP SECURITY</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-black rounded border ${
                      assessment.composite_score > 75 
                        ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      SCORE: {assessment.composite_score}/100
                    </span>
                    <span className="text-[10px] font-mono opacity-70">
                      {assessment.latency_ms}ms
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className={`text-xs font-bold ${assessment.composite_score > 75 ? 'text-red-300' : 'text-amber-200'}`}>
                    {assessment.composite_score > 75 ? 'Step 2 Verification Prompted (High Anomaly)' : 'Step 2 Verification Prompted'}
                  </h4>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Composite anomaly rating is{' '}
                    <strong className={assessment.composite_score > 75 ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>
                      {assessment.composite_score}/100
                    </strong>
                    . {assessment.composite_score > 75 
                      ? `Critical anomaly signals detected (${getInterstitialReasonSummary(assessment.reason_codes)}). Please enter your secondary PIN on the device to authorize immediate completion under user liability.`
                      : 'Please re-enter your security PIN on the device to authorize immediate completion under user liability.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] font-mono border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className={`w-3 h-3 ${assessment.composite_score > 75 ? 'text-red-400' : 'text-amber-400'}`} />
                    <span className={assessment.composite_score > 75 ? 'text-red-300/90 font-medium' : 'text-amber-300/90 font-medium'}>
                      Irreversible User Override Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Transaction Context Pill */}
              <div 
                className="p-2.5 rounded-xl border text-[11px] font-mono flex items-center justify-between text-gray-400"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <span>Amount: <strong className="text-white">₹{transaction.amount.toLocaleString('en-IN')}</strong></span>
                <span>Receiver: <strong className="text-rose-400">{transaction.receiver_name || transaction.receiver_id}</strong></span>
              </div>

              {/* Collapsible SHAP Feature Attribution Breakdown (View Button Toggle) */}
              {showShapDetails && (
                <div 
                  className="space-y-2 p-3 rounded-2xl border text-left animate-fadeIn max-h-[190px] overflow-y-auto"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)'
                  }}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold border-b pb-1.5 border-white/10 text-white">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-rose-500" />
                      SHAP FEATURE ATTRIBUTION
                    </span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                      SCORE: {assessment.composite_score}/100
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[10px]">
                    {generateSHAPFeatures(assessment, transaction).map((feat, idx) => (
                      <div 
                        key={idx} 
                        className="p-2 rounded-xl bg-[#121216] border border-white/5 space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="truncate max-w-[170px] text-white">{feat.name}</span>
                          <span className={`font-mono px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            feat.is_positive_risk ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}>
                            {feat.impact_score > 0 ? `+${feat.impact_score}` : feat.impact_score} pts
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono text-gray-400">
                          <span className="truncate max-w-[140px]">{feat.raw_value}</span>
                          <span className="font-semibold">Weight: {feat.weight_percentage}%</span>
                        </div>
                        <p className="text-[9px] leading-tight text-gray-400">{feat.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Actions: Report Button & Side-by-Side View / Continue CTAs & Abort Link */}
            <div className="pt-2 space-y-2">
              <ReportReceiverButton
                currentUserId={transaction.user_id}
                senderId={transaction.user_id}
                receiverId={transaction.receiver_id}
                receiverName={transaction.receiver_name}
                riskAssessment={assessment}
                transactionContext={{
                  transaction_id: transaction.transaction_id,
                  amount: transaction.amount,
                  currency: transaction.currency,
                  device_id: transaction.device_id,
                  note: transaction.note
                }}
                onReportSubmitted={(repId) => onLogEvent?.('FRAUD_REPORT_SUBMITTED', { report_id: repId })}
              />

              {/* Side-by-Side Layout: 50% "View" Button + CSS Gap + 50% "Continue" Button */}
              <div className="flex items-center gap-2.5 w-full">
                {/* 1. View Button (50% Width) */}
                <button
                  type="button"
                  onClick={() => setShowShapDetails(prev => !prev)}
                  className={`flex-1 py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all shadow-sm active:scale-[0.98] ${
                    showShapDetails 
                      ? 'bg-rose-600 border-rose-500 text-white' 
                      : 'bg-[var(--phone-card)] border-[var(--border-default)] text-gray-300 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showShapDetails ? 'Hide' : 'View'}</span>
                </button>

                {/* 2. Continue Button (50% Width) */}
                <button
                  type="button"
                  onClick={() => setScreen('step2_pin')}
                  className="flex-1 py-3 px-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 shadow-md transition-all active:scale-[0.98]"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Secondary Abort Action */}
              <button
                type="button"
                onClick={handleResetFlow}
                className="w-full text-center py-1 text-[11px] font-mono text-gray-400 hover:text-rose-400 transition"
              >
                ✕ Cancel transaction and return home
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN: STEP 2 - SECONDARY PIN */}
        {/* ========================================================= */}
        {screen === 'step2_pin' && assessment && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-[var(--phone-bg)] animate-fadeIn">
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setScreen('interstitial')}
                  className="p-1.5 rounded-xl border text-gray-300 hover:text-white transition"
                  style={{
                    backgroundColor: 'var(--phone-card)',
                    borderColor: 'var(--border-default)'
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  assessment.composite_score > 75 
                    ? 'bg-red-950 text-red-400 border border-red-800' 
                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}>
                  STEP 2: SECONDARY VERIFICATION
                </span>
                <div className="w-6"></div>
              </div>

              <div className="text-center mt-1">
                <p className="text-[11px] text-gray-400">High Risk Step-Up Challenge</p>
                <h4 className="text-sm font-bold text-white mt-0.5">{transaction.receiver_name}</h4>
                <div className="text-2xl font-black font-mono mt-0.5 text-rose-500">
                  ₹{transaction.amount.toLocaleString('en-IN')}
                </div>
                
                {/* PIN Dots */}
                <div className={`flex items-center justify-center gap-4 my-3.5 ${isShaking ? 'animate-shake' : ''}`}>
                  {[0, 1, 2, 3].map(idx => (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 border ${
                        secondaryPin.length > idx 
                          ? (assessment.composite_score > 75 ? 'bg-red-500 scale-125 border-red-400' : 'bg-amber-500 scale-125 border-amber-400') 
                          : 'bg-[var(--phone-card)] border-[var(--border-default)]'
                      }`}
                    />
                  ))}
                </div>

                {errorMessage && (
                  <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-rose-300 font-bold bg-rose-950/60 border border-rose-800 rounded-xl py-1 px-3 mb-2 animate-pulse">
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
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
                  onClick={() => handlePinKeypadPress(num, true)}
                  className="h-12 rounded-2xl font-mono text-lg font-bold border transition flex items-center justify-center bg-[var(--phone-card)] border-[var(--border-default)] text-white hover:bg-rose-950/30 active:scale-95 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  handlePinKeypadPress('1', true);
                  setTimeout(() => handlePinKeypadPress('3', true), 80);
                  setTimeout(() => handlePinKeypadPress('3', true), 160);
                  setTimeout(() => handlePinKeypadPress('7', true), 240);
                }}
                className="h-12 rounded-2xl font-mono text-xs font-semibold border transition flex flex-col items-center justify-center bg-[var(--phone-card)] border-[var(--border-default)] text-rose-400 hover:text-rose-300"
              >
                <Fingerprint className="w-4 h-4" />
                <span className="text-[8px] font-bold">Biometric</span>
              </button>
              <button
                type="button"
                onClick={() => handlePinKeypadPress('0', true)}
                className="h-12 rounded-2xl font-mono text-lg font-bold border transition flex items-center justify-center bg-[var(--phone-card)] border-[var(--border-default)] text-white hover:bg-rose-950/30 active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handlePinBackspace(true)}
                className="h-12 rounded-2xl font-mono text-sm border transition flex items-center justify-center bg-[var(--phone-card)] border-[var(--border-default)] text-gray-400 hover:text-rose-400"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 4: FINAL RESULT / RECEIPT (PEPPERMONEY STYLE) */}
        {/* ========================================================= */}
        {screen === 'result' && assessment && (
          <div className="flex-1 flex flex-col justify-between p-5 overflow-y-auto bg-[var(--phone-bg)] animate-fadeIn">
            <div className="space-y-3.5">
              
              {/* Payment Successful Card */}
              <div 
                className="text-center py-4 px-3 rounded-2xl border shadow-md transition-all"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <div 
                  className="w-14 h-14 rounded-full border-2 flex items-center justify-center mx-auto mb-2 shadow-lg bg-[#18181D]"
                  style={{
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)'
                  }}
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                
                <h3 className="text-lg font-black text-white">Payment Successful</h3>
                
                <div className="text-2xl font-black font-mono mt-0.5 text-rose-500">
                  ₹{transaction.amount.toLocaleString('en-IN')}
                </div>
                
                <p className="text-[11px] mt-1 text-gray-400">
                  Transferred to <span className="font-bold text-white">{transaction.receiver_name}</span>
                </p>

                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-gray-400">Remaining Balance:</span>
                  <span className="font-bold text-emerald-400">
                    ₹{accountBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {assessment.composite_score > 40 && (
                  <div className={`inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                    assessment.composite_score > 75 
                      ? 'bg-red-950 text-red-400 border border-red-800' 
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
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
                <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-2 text-white">
                  <span>ADVANCED REASON CODES</span>
                  <span className="text-[10px] font-normal text-rose-400">Hover/Tap for Details</span>
                </div>

                <div className="space-y-1.5">
                  {assessment.reason_codes.map((code, idx) => (
                    <div key={idx} className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveTooltip(activeTooltip === code ? null : code)}
                        onMouseEnter={() => setActiveTooltip(code)}
                        onMouseLeave={() => setActiveTooltip(null)}
                        className="w-full text-left flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#141418] border border-white/5 text-xs font-mono transition hover:border-rose-500"
                      >
                        <span className="font-semibold text-gray-200">{code}</span>
                        <HelpCircle className="w-3 h-3 text-rose-500" />
                      </button>

                      {activeTooltip === code && (
                        <div 
                          className="absolute left-0 right-0 bottom-full mb-1 p-2.5 rounded-xl bg-[#1C1C22] border border-rose-500 text-[11px] shadow-2xl z-50 text-gray-200"
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
                className="p-2.5 rounded-xl border text-[9px] font-mono space-y-1 text-gray-400"
                style={{
                  backgroundColor: 'var(--phone-card)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <div className="flex items-center justify-between">
                  <span>Transaction ID:</span>
                  <span className="font-bold text-white">{transaction.transaction_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Settlement:</span>
                  <span className="font-bold text-rose-400">Irreversible Dispatch</span>
                </div>
              </div>

            </div>

            {/* Reset CTA */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleResetFlow}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-[var(--border-default)] bg-[var(--phone-card)] text-white hover:border-rose-500 transition shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                <span>New UPI Transaction</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN: FALLBACK STATE (NETWORK CIRCUIT BREAKER) */}
        {/* ========================================================= */}
        {screen === 'fallback' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-[var(--phone-bg)] text-center animate-fadeIn">
            <div className="my-auto">
              <div className="w-16 h-16 rounded-full bg-amber-950/60 border border-amber-800 flex items-center justify-center text-amber-400 mx-auto mb-4">
                <Info className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold mb-1 text-white">Network Stream Interrupted</h3>
              <p className="text-xs max-w-xs mx-auto leading-relaxed text-gray-400">
                Pre-authorization handshake timed out after 200ms. Transaction safely buffered in local circuit-breaker.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setScreen('amount_entry')}
                className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs bg-rose-600 hover:bg-rose-500 shadow-md transition"
              >
                Retry Transaction
              </button>
              <button
                onClick={handleResetFlow}
                className="w-full py-2.5 px-4 rounded-xl text-xs transition border border-[var(--border-default)] bg-[var(--phone-card)] text-gray-300 hover:text-white"
              >
                Back to Contacts
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
