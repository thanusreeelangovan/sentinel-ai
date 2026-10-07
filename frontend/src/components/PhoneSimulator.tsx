import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  AtSign,
  Ban,
  Battery,
  Camera,
  CheckCircle2,
  ChevronRight,
  Delete,
  Eye,
  EyeOff,
  Flag,
  History,
  Landmark,
  Loader2,
  Phone,
  PlayCircle,
  QrCode,
  ReceiptText,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  Upload,
  Users,
  WalletCards,
  Wifi,
  XCircle,
} from 'lucide-react';
import {
  BankAccount,
  DemoScenario,
  PaymentMethod,
  PaymentRecord,
  RiskAssessment,
  SharedTransaction,
  UpiContact,
} from '../types/sentinel';
import {
  DEFAULT_ACCOUNT,
  DEMO_SCENARIOS,
  INITIAL_RECENT_ACTIVITY,
  UPI_CONTACTS,
} from '../data/mockData';
import { reportReceiver } from '../services/apiClient';

interface PhoneSimulatorProps {
  transaction: SharedTransaction;
  setTransaction: React.Dispatch<React.SetStateAction<SharedTransaction>>;
  assessment: RiskAssessment | null;
  evaluationError?: string | null;
  onExecuteTransaction: (tx: SharedTransaction) => void;
  onReset: () => void;
  isProcessing: boolean;
  pipelineStep: number;
  onLogEvent?: (eventType: string, details: Record<string, unknown> | string) => void;
}

type ScreenType =
  | 'home'
  | 'balance_pin'
  | 'balance'
  | 'contacts'
  | 'phone'
  | 'upi_id'
  | 'qr'
  | 'bank_transfer'
  | 'amount'
  | 'review'
  | 'payment_pin'
  | 'pipeline'
  | 'risk_interstitial'
  | 'stepup_pin'
  | 'result'
  | 'activity'
  | 'activity_pin'
  | 'activity_detail'
  | 'demo_lab';

const ACCOUNT_PIN = '4092';
const BALANCE_STORAGE_KEY = 'sentinel_account_balance';
const HISTORY_STORAGE_KEY = 'sentinel_recent_activity';
const BLOCKED_STORAGE_KEY = 'sentinel_blocked_receivers';

const randomDigits = (length: number): string => {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, value => String(value % 10)).join('');
};

const newTransactionId = (): string =>
  `TXN-UPI-${randomDigits(6)}-${randomDigits(4)}`;

const formatAmount = (amount: number): string =>
  amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const loadHistory = (): PaymentRecord[] => {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (saved) return JSON.parse(saved) as PaymentRecord[];
  } catch {
    // fall through to fixtures
  }
  return INITIAL_RECENT_ACTIVITY;
};

const loadBlocked = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(BLOCKED_STORAGE_KEY) || '[]') as string[];
  } catch {
    return [];
  }
};

const consumerReason = (code: string): string => {
  const labels: Record<string, string> = {
    HIGH_ANOMALY: 'This payment pattern is unusual for your account.',
    HIGH_TRANSACTION_VELOCITY: 'Several payment signals indicate unusually high activity.',
    NEW_RECEIVER: 'You have little or no payment history with this receiver.',
    UNKNOWN_RECEIVER_TYPE: 'The receiver category could not be fully verified.',
    UNUSUAL_AMOUNT: 'This amount is outside your usual payment range.',
    NEW_DEVICE: 'This payment is coming from an unfamiliar device.',
    NEW_LOCATION: 'The payment location differs from your recent activity.',
    UNUSUAL_HOUR: 'This payment is being made at an unusual time.',
    SUSPICIOUS_RECEIVER: 'The receiver has elevated risk signals.',
    BEHAVIORAL_DEVIATION: 'The payment differs from your recent usage pattern.',
    UNUSUAL_AMOUNT_SURGE: 'This amount is much higher than your usual payments.',
    EMULATOR_DEVICE_DETECTED: 'The device environment could not be trusted.',
  };
  return labels[code] || code.replaceAll('_', ' ').toLowerCase();
};

const buildReceiptBlob = async (record: PaymentRecord): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1250;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Receipt rendering is unavailable');

  ctx.fillStyle = '#0b0b0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 46px system-ui';
  ctx.fillText('BharatPay', 70, 100);

  ctx.fillStyle = '#22c55e';
  ctx.font = '700 38px system-ui';
  ctx.fillText('Payment processed', 70, 185);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 72px system-ui';
  ctx.fillText(`₹${formatAmount(record.amount)}`, 70, 295);

  ctx.font = '700 34px system-ui';
  ctx.fillText(record.recipientName, 70, 375);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '500 25px system-ui';
  ctx.fillText(record.recipientId, 70, 420);

  const rows: Array<[string, string]> = [
    ['Date & time', formatTime(record.timestamp)],
    ['Paid from', `${record.bankName} ${record.accountMask}`],
    ['UPI transaction ID', record.upiTransactionId],
    ['Reference number', record.referenceNumber],
    ['Status', record.status],
  ];

  let y = 540;
  rows.forEach(([label, value]) => {
    ctx.fillStyle = '#71717a';
    ctx.font = '500 22px system-ui';
    ctx.fillText(label, 70, y);
    ctx.fillStyle = '#f4f4f5';
    ctx.font = '600 27px system-ui';
    ctx.fillText(value, 70, y + 42);
    y += 125;
  });

  ctx.fillStyle = '#52525b';
  ctx.font = '500 20px system-ui';
  ctx.fillText('Protected by SentinelAI pre-authorization risk checks', 70, 1170);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Could not create receipt image'));
    }, 'image/png');
  });
};

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({
  transaction,
  setTransaction,
  assessment,
  evaluationError,
  onExecuteTransaction,
  onReset,
  isProcessing,
  pipelineStep,
  onLogEvent,
}) => {
  const [screen, setScreen] = useState<ScreenType>('home');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CONTACT');
  const [selectedContact, setSelectedContact] = useState<UpiContact | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [upiInput, setUpiInput] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountConfirm, setBankAccountConfirm] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [accountBalance, setAccountBalance] = useState<number>(() => {
    const saved = localStorage.getItem(BALANCE_STORAGE_KEY);
    return saved ? Number(saved) : DEFAULT_ACCOUNT.balance;
  });
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [history, setHistory] = useState<PaymentRecord[]>(loadHistory);
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(null);
  const [lastReceipt, setLastReceipt] = useState<PaymentRecord | null>(null);
  const [blockedReceivers, setBlockedReceivers] = useState<string[]>(loadBlocked);
  const [highRiskAcknowledged, setHighRiskAcknowledged] = useState(false);
  const [reportReason, setReportReason] = useState('Suspected scam');
  const [reportState, setReportState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [reportMessage, setReportMessage] = useState('');
  const [qrMessage, setQrMessage] = useState('Point the camera at a UPI QR or upload one from your gallery.');
  const [cameraActive, setCameraActive] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return UPI_CONTACTS;
    return UPI_CONTACTS.filter(contact =>
      [contact.name, contact.vpa, contact.phone, contact.category]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [searchQuery]);

  const persistHistory = (records: PaymentRecord[]) => {
    setHistory(records);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
  };

  const persistBlocked = (blocked: string[]) => {
    setBlockedReceivers(blocked);
    localStorage.setItem(BLOCKED_STORAGE_KEY, JSON.stringify(blocked));
  };

  const resetSensitiveState = () => {
    setPin('');
    setPinError(null);
    setBalanceVisible(false);
  };

  const goHome = () => {
    stopCamera();
    resetSensitiveState();
    setScreen('home');
    setSelectedRecord(null);
    setSearchQuery('');
    setQrMessage('Point the camera at a UPI QR or upload one from your gallery.');
    setShareMessage('');
  };

  const stopCamera = () => {
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    cameraStreamRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const applyRecipient = (
    name: string,
    id: string,
    receiverType: string,
    method: PaymentMethod,
    presetAmount?: number,
    presetNote?: string,
    riskyDevice = false,
  ) => {
    if (blockedReceivers.includes(id)) {
      setPinError('This receiver is blocked. Unblock them before starting another payment.');
      return;
    }

    setPaymentMethod(method);
    setSelectedContact(
      UPI_CONTACTS.find(item => item.vpa === id) || {
        id,
        name,
        vpa: id,
        phone: '',
        category: method === 'BANK_TRANSFER' ? 'Bank beneficiary' : 'UPI recipient',
        initials: name
          .split(' ')
          .map(part => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        verified: receiverType !== 'unverified_p2p',
        receiver_type: receiverType,
      },
    );
    setAmountInput(presetAmount ? String(presetAmount) : '');
    setNote(presetNote || '');
    setTransaction(prev => ({
      ...prev,
      transaction_id: newTransactionId(),
      amount: presetAmount || 0,
      receiver_id: id,
      receiver_name: name,
      receiver_type: receiverType,
      timestamp: new Date().toISOString(),
      note: presetNote || '',
      device_type: riskyDevice ? 'android_emulator' : 'ios',
      device_id: riskyDevice ? 'DEV_ROOTED_EMU_X86' : 'DEV_APPL_IPHONE_15_PRO_ENCLAVE',
    }));
    setPinError(null);
    setScreen(presetAmount ? 'review' : 'amount');
  };

  const handleContact = (contact: UpiContact) => {
    applyRecipient(contact.name, contact.vpa, contact.receiver_type, 'CONTACT');
  };

  const resolvePhone = () => {
    const normalized = phoneInput.replace(/\D/g, '').slice(-10);
    const contact = UPI_CONTACTS.find(item => item.phone === normalized);
    if (!contact) {
      setPinError('No UPI account was found for this demo phone number.');
      return;
    }
    applyRecipient(contact.name, contact.vpa, contact.receiver_type, 'PHONE');
  };

  const resolveUpi = () => {
    const value = upiInput.trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,}@[a-z0-9._-]{2,}$/i.test(value)) {
      setPinError('Enter a valid UPI ID, for example neha.sharma@oksbi.');
      return;
    }
    const contact = UPI_CONTACTS.find(item => item.vpa.toLowerCase() === value);
    const fallbackName = value.split('@')[0].replace(/[._-]+/g, ' ');
    applyRecipient(
      contact?.name || fallbackName.replace(/\b\w/g, char => char.toUpperCase()),
      value,
      contact?.receiver_type || 'new_merchant',
      'UPI_ID',
    );
  };

  const resolveBankTransfer = () => {
    if (!/^\d{8,18}$/.test(bankAccountNumber)) {
      setPinError('Enter a valid 8-18 digit account number.');
      return;
    }
    if (bankAccountNumber !== bankAccountConfirm) {
      setPinError('Account numbers do not match.');
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(bankIfsc)) {
      setPinError('Enter a valid IFSC code.');
      return;
    }

    const suffix = bankAccountNumber.slice(-4);
    applyRecipient(
      `Bank beneficiary •••• ${suffix}`,
      `bank:${bankAccountNumber}`,
      'bank_account',
      'BANK_TRANSFER',
    );
  };

  const parseUpiUri = (raw: string) => {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'upi:' || url.hostname !== 'pay') {
        throw new Error('This QR is not a UPI payment QR.');
      }
      const vpa = url.searchParams.get('pa');
      if (!vpa) throw new Error('UPI QR is missing the payee address.');
      const name = url.searchParams.get('pn') || vpa.split('@')[0];
      const amountParam = url.searchParams.get('am');
      const amount = amountParam ? Number(amountParam) : undefined;
      const qrNote = url.searchParams.get('tn') || '';

      const contact = UPI_CONTACTS.find(item => item.vpa.toLowerCase() === vpa.toLowerCase());
      applyRecipient(
        contact?.name || name,
        vpa,
        contact?.receiver_type || 'new_merchant',
        'QR',
        amount && Number.isFinite(amount) && amount > 0 ? amount : undefined,
        qrNote,
      );
      stopCamera();
    } catch (err: unknown) {
      setQrMessage(err instanceof Error ? err.message : 'Could not read this QR.');
    }
  };

  const decodeQrSource = async (source: ImageBitmap | HTMLVideoElement) => {
    const BarcodeDetectorCtor = (window as unknown as {
      BarcodeDetector?: new (options: { formats: string[] }) => {
        detect: (input: ImageBitmap | HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
      };
    }).BarcodeDetector;

    if (!BarcodeDetectorCtor) {
      throw new Error('QR decoding is not supported by this browser. Use a recent Chromium-based browser.');
    }

    const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
    const results = await detector.detect(source);
    const raw = results[0]?.rawValue;
    if (!raw) throw new Error('No QR code was detected.');
    parseUpiUri(raw);
  };

  const handleQrUpload = async (file?: File) => {
    if (!file) return;
    try {
      setQrMessage('Reading QR…');
      const bitmap = await createImageBitmap(file);
      await decodeQrSource(bitmap);
      bitmap.close();
    } catch (err: unknown) {
      setQrMessage(err instanceof Error ? err.message : 'Unable to decode this QR.');
    }
  };

  const scanVideoFrame = async () => {
    if (!videoRef.current || !cameraStreamRef.current) return;
    try {
      await decodeQrSource(videoRef.current);
      return;
    } catch {
      scanTimerRef.current = window.setTimeout(scanVideoFrame, 550);
    }
  };

  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraActive(true);
      setQrMessage('Align a UPI QR inside the frame.');
      window.setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          scanVideoFrame();
        }
      }, 50);
    } catch (err: unknown) {
      setQrMessage(err instanceof Error ? err.message : 'Camera permission was not granted.');
      setCameraActive(false);
    }
  };

  const confirmAmount = () => {
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPinError('Enter a valid payment amount.');
      return;
    }
    if (amount > 100000) {
      setPinError('Prototype UPI limit is ₹1,00,000 per transaction.');
      return;
    }
    if (amount > accountBalance) {
      setPinError('Insufficient balance for this payment.');
      return;
    }

    setTransaction(prev => ({
      ...prev,
      amount,
      timestamp: new Date().toISOString(),
      note,
    }));
    setPinError(null);
    setScreen('review');
  };

  const submitPin = (purpose: 'balance' | 'payment' | 'stepup' | 'activity') => {
    if (pin.length !== 4) return;
    if (pin !== ACCOUNT_PIN) {
      setPinError('Incorrect UPI PIN. Please try again.');
      setPin('');
      return;
    }

    setPinError(null);
    setPin('');

    if (purpose === 'balance') {
      setBalanceVisible(true);
      setScreen('balance');
      return;
    }

    if (purpose === 'activity') {
      setScreen('activity_detail');
      return;
    }

    if (purpose === 'payment') {
      setScreen('pipeline');
      onLogEvent?.('UPI_PIN_VERIFIED', {
        transaction_id: transaction.transaction_id,
        purpose: 'payment_authorization',
      });
      onExecuteTransaction({
        ...transaction,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    completePayment();
  };

  const addPinDigit = (digit: string, purpose: 'balance' | 'payment' | 'stepup' | 'activity') => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setPinError(null);
    if (next.length === 4) {
      window.setTimeout(() => {
        setPin(next);
        if (next !== ACCOUNT_PIN) {
          setPinError('Incorrect UPI PIN. Please try again.');
          setPin('');
          return;
        }
        setPin('');
        setPinError(null);
        if (purpose === 'balance') {
          setBalanceVisible(true);
          setScreen('balance');
        } else if (purpose === 'activity') {
          setScreen('activity_detail');
        } else if (purpose === 'payment') {
          setScreen('pipeline');
          onExecuteTransaction({
            ...transaction,
            timestamp: new Date().toISOString(),
          });
        } else {
          completePayment();
        }
      }, 180);
    }
  };

  const completePayment = () => {
    const amount = transaction.amount;
    const nextBalance = Math.max(0, accountBalance - amount);
    setAccountBalance(nextBalance);
    localStorage.setItem(BALANCE_STORAGE_KEY, String(nextBalance));

    const record: PaymentRecord = {
      id: crypto.randomUUID(),
      transactionId: transaction.transaction_id,
      upiTransactionId: randomDigits(12),
      referenceNumber: randomDigits(12),
      recipientName: transaction.receiver_name || transaction.receiver_id,
      recipientId: transaction.receiver_id,
      amount,
      currency: transaction.currency,
      timestamp: new Date().toISOString(),
      status: 'Payment processed',
      method: paymentMethod,
      bankName: DEFAULT_ACCOUNT.bankName,
      accountMask: DEFAULT_ACCOUNT.accountMask,
      note: transaction.note,
      decision: assessment?.decision,
      riskScore: assessment?.composite_score,
    };

    const updated = [record, ...history].slice(0, 20);
    persistHistory(updated);
    setLastReceipt(record);
    setScreen('result');
    setHighRiskAcknowledged(false);
    onLogEvent?.('PAYMENT_PROCESSED', {
      transaction_id: record.transactionId,
      upi_transaction_id: record.upiTransactionId,
      decision: assessment?.decision,
    });
  };

  useEffect(() => {
    if (isProcessing) {
      setScreen('pipeline');
      return;
    }
    if (!assessment || screen !== 'pipeline') return;

    if (assessment.risk_level === 'LOW') {
      completePayment();
    } else {
      setScreen('risk_interstitial');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing, assessment]);

  const cancelRiskPayment = () => {
    setLastReceipt(null);
    setScreen('home');
    setHighRiskAcknowledged(false);
    onReset();
  };

  const blockCurrentReceiver = () => {
    if (!blockedReceivers.includes(transaction.receiver_id)) {
      persistBlocked([...blockedReceivers, transaction.receiver_id]);
    }
    setReportMessage(`${transaction.receiver_name || transaction.receiver_id} is now blocked on this account.`);
  };

  const unblockReceiver = (receiverId: string) => {
    persistBlocked(blockedReceivers.filter(item => item !== receiverId));
  };

  const submitHighRiskReport = async () => {
    setReportState('loading');
    setReportMessage('');
    const response = await reportReceiver({
      sender_id: transaction.user_id,
      receiver_id: transaction.receiver_id,
      risk_score: assessment?.composite_score || 0,
      reason: reportReason,
      transaction_context: {
        transaction_id: transaction.transaction_id,
        amount: transaction.amount,
        currency: transaction.currency,
        receiver_name: transaction.receiver_name,
        device_id: transaction.device_id,
        note: transaction.note,
      },
    });
    if (response.ok) {
      setReportState('success');
      setReportMessage(response.reportId ? `Report reference: ${response.reportId}` : response.message);
    } else {
      setReportState('error');
      setReportMessage(response.message);
    }
  };

  const runDemo = (scenario: DemoScenario) => {
    const payee = scenario.payee;
    applyRecipient(
      payee.name,
      payee.vpa,
      payee.receiver_type,
      'DEMO',
      payee.defaultAmount,
      payee.defaultNote,
      payee.presetRisk === 'high',
    );
  };

  const openRecentRecord = (record: PaymentRecord) => {
    setSelectedRecord(record);
    setPin('');
    setPinError(null);
    setScreen('activity_pin');
  };

  const shareReceipt = async (record: PaymentRecord) => {
    try {
      const blob = await buildReceiptBlob(record);
      const file = new File([blob], `BharatPay-${record.upiTransactionId}.png`, {
        type: 'image/png',
      });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (navigator.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await navigator.share({
          title: 'UPI payment receipt',
          text: `Payment processed · UPI transaction ID ${record.upiTransactionId}`,
          files: [file],
        });
        setShareMessage('Receipt shared.');
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(url);
      setShareMessage('Receipt image saved.');
    } catch (err: unknown) {
      setShareMessage(err instanceof Error ? err.message : 'Unable to share receipt.');
    }
  };

  const paymentActions: Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    screen: ScreenType;
  }> = [
    { label: 'Scan QR', icon: QrCode, screen: 'qr' },
    { label: 'Contacts', icon: Users, screen: 'contacts' },
    { label: 'Phone No.', icon: Phone, screen: 'phone' },
    { label: 'UPI ID', icon: AtSign, screen: 'upi_id' },
  ];

  const renderPinPad = (
    title: string,
    subtitle: string,
    purpose: 'balance' | 'payment' | 'stepup' | 'activity',
  ) => (
    <div className="flex-1 p-5 flex flex-col">
      <button
        onClick={() => {
          setPin('');
          setPinError(null);
          setScreen(purpose === 'activity' ? 'activity' : purpose === 'balance' ? 'home' : purpose === 'stepup' ? 'risk_interstitial' : 'review');
        }}
        className="w-9 h-9 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-300"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="text-center mt-8">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6 text-rose-400" />
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-xs text-zinc-500 mt-2">{subtitle}</p>

        <div className="flex justify-center gap-3 mt-6">
          {[0, 1, 2, 3].map(index => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full border ${
                index < pin.length ? 'bg-rose-500 border-rose-500' : 'border-zinc-600'
              }`}
            />
          ))}
        </div>

        {pinError && <p className="text-xs text-red-400 mt-4">{pinError}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(number => (
          <button
            key={number}
            onClick={() => addPinDigit(String(number), purpose)}
            className="h-14 rounded-2xl border border-zinc-700 bg-zinc-900 text-white text-lg font-semibold hover:border-rose-500 transition"
          >
            {number}
          </button>
        ))}
        <div />
        <button
          onClick={() => addPinDigit('0', purpose)}
          className="h-14 rounded-2xl border border-zinc-700 bg-zinc-900 text-white text-lg font-semibold hover:border-rose-500 transition"
        >
          0
        </button>
        <button
          onClick={() => setPin(current => current.slice(0, -1))}
          className="h-14 rounded-2xl border border-zinc-700 bg-zinc-900 text-zinc-300 flex items-center justify-center"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const riskTone =
    assessment?.risk_level === 'HIGH'
      ? 'phone-glow-crimson'
      : assessment?.risk_level === 'MEDIUM'
        ? 'phone-glow-amber'
        : assessment?.risk_level === 'LOW'
          ? 'phone-glow-green'
          : 'phone-glow-default';

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative w-[360px] sm:w-[380px] h-[720px] rounded-[48px] bg-[var(--phone-bg)] border-[6px] overflow-hidden flex flex-col shadow-2xl ${riskTone}`}
      >
        <div className="w-full px-6 pt-3.5 pb-2 flex items-center justify-between text-xs border-b border-zinc-800 bg-[var(--phone-header)]">
          <span className="font-bold text-[13px] text-white">9:41</span>
          <div className="w-24 h-4 rounded-full bg-black flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {screen === 'home' && (
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">BharatPay</p>
                <h2 className="text-lg font-black text-white mt-1">Payments</h2>
              </div>
              <button
                onClick={() => setScreen('demo_lab')}
                className="text-[10px] px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 flex items-center gap-1.5"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Demo Lab
              </button>
            </div>

            <div className="mt-4 rounded-3xl border border-zinc-700 bg-zinc-900/80 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-950 border border-rose-800 flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-rose-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">{DEFAULT_ACCOUNT.bankName}</p>
                  <p className="text-[10px] text-zinc-500">{DEFAULT_ACCOUNT.accountMask}</p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase">Available balance</p>
                  <p className="text-xl font-black text-white mt-1">
                    {balanceVisible ? `₹${formatAmount(accountBalance)}` : '₹ ••••••'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setBalanceVisible(false);
                    setPin('');
                    setPinError(null);
                    setScreen('balance_pin');
                  }}
                  className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-200 flex items-center gap-1.5"
                >
                  {balanceVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  Check balance
                </button>
              </div>
            </div>

            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 mt-5 mb-3">Pay</p>
            <div className="grid grid-cols-4 gap-2">
              {paymentActions.map(action => (
                <button
                  key={action.label}
                  onClick={() => {
                    setPinError(null);
                    setScreen(action.screen);
                  }}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 hover:border-rose-600 transition"
                >
                  <action.icon className="w-5 h-5 text-rose-400" />
                  <span className="text-[9px] text-zinc-300 text-center">{action.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setPinError(null);
                setScreen('bank_transfer');
              }}
              className="w-full mt-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <Landmark className="w-5 h-5 text-rose-400" />
                <div>
                  <p className="text-xs font-bold text-white">Bank Transfer</p>
                  <p className="text-[10px] text-zinc-500">Account number + IFSC</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </button>

            <div className="flex items-center justify-between mt-5 mb-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Recent activity</p>
              <button onClick={() => setScreen('activity')} className="text-[10px] text-rose-400">View all</button>
            </div>

            <div className="space-y-2">
              {history.slice(0, 3).map(record => (
                <button
                  key={record.id}
                  onClick={() => openRecentRecord(record)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-xs font-semibold text-white">{record.recipientName}</p>
                    <p className="text-[9px] text-zinc-500 mt-1">{formatTime(record.timestamp)} · {record.status}</p>
                  </div>
                  <p className="text-xs font-bold text-zinc-400">₹ ••••</p>
                </button>
              ))}
            </div>

            {blockedReceivers.length > 0 && (
              <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-red-400">Blocked receivers</p>
                {blockedReceivers.slice(0, 2).map(receiver => (
                  <div key={receiver} className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-zinc-400 truncate mr-2">{receiver}</span>
                    <button onClick={() => unblockReceiver(receiver)} className="text-[10px] text-red-300 underline">Unblock</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 mt-5 text-[9px] text-zinc-600">
              <ShieldCheck className="w-3.5 h-3.5" />
              Protected by SentinelAI
            </div>
          </div>
        )}

        {screen === 'balance_pin' && renderPinPad(
          'Enter UPI PIN',
          'Required to view the balance for State Bank of India •••• 4821.',
          'balance',
        )}

        {screen === 'balance' && (
          <div className="flex-1 p-5 flex flex-col">
            <button onClick={goHome} className="w-9 h-9 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-300">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <WalletCards className="w-10 h-10 text-emerald-400 mb-4" />
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Available balance</p>
              <p className="text-3xl font-black text-white mt-2">₹{formatAmount(accountBalance)}</p>
              <p className="text-xs text-zinc-500 mt-2">{DEFAULT_ACCOUNT.bankName} {DEFAULT_ACCOUNT.accountMask}</p>
            </div>
          </div>
        )}

        {screen === 'contacts' && (
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="flex items-center gap-3">
              <button onClick={goHome} className="w-9 h-9 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-300">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-sm font-bold text-white">Pay a contact</h3>
                <p className="text-[10px] text-zinc-500">Choose from your UPI contacts</p>
              </div>
            </div>
            <div className="relative mt-4">
              <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search name, phone or UPI ID"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 text-xs text-white pl-9 pr-3 py-3 outline-none focus:border-rose-500"
              />
            </div>
            <div className="space-y-2 mt-4">
              {filteredContacts.map(contact => {
                const blocked = blockedReceivers.includes(contact.vpa);
                return (
                  <button
                    key={contact.id}
                    disabled={blocked}
                    onClick={() => handleContact(contact)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 flex items-center gap-3 text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                      {contact.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-white truncate">{contact.name}</p>
                        {contact.verified && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <p className="text-[9px] text-zinc-500 truncate">{contact.vpa}</p>
                    </div>
                    {blocked ? <Ban className="w-4 h-4 text-red-400" /> : <ChevronRight className="w-4 h-4 text-zinc-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {screen === 'phone' && (
          <div className="flex-1 p-5">
            <button onClick={goHome} className="w-9 h-9 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-300">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-white mt-6">Pay by mobile number</h3>
            <p className="text-xs text-zinc-500 mt-2">Enter a registered 10-digit mobile number.</p>
            <div className="flex items-center gap-2 mt-6">
              <div className="px-3 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-xs text-zinc-400">+91</div>
              <input
                value={phoneInput}
                onChange={event => setPhoneInput(event.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric"
                placeholder="9876543210"
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 text-sm text-white px-3 py-3 outline-none focus:border-rose-500"
              />
            </div>
            {pinError && <p className="text-xs text-red-400 mt-3">{pinError}</p>}
            <button onClick={resolvePhone} className="w-full mt-6 py-3 rounded-2xl bg-rose-600 text-white text-xs font-bold">Continue</button>
          </div>
        )}

        {screen === 'upi_id' && (
          <div className="flex-1 p-5">
            <button onClick={goHome} className="w-9 h-9 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-300">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-white mt-6">Pay by UPI ID</h3>
            <p className="text-xs text-zinc-500 mt-2">Enter the recipient's UPI ID.</p>
            <input
              value={upiInput}
              onChange={event => setUpiInput(event.target.value)}
              placeholder="name@bank"
              className="w-full mt-6 rounded-xl border border-zinc-700 bg-zinc-900 text-sm text-white px-3 py-3 outline-none focus:border-rose-500"
            />
            {pinError && <p className="text-xs text-red-400 mt-3">{pinError}</p>}
            <button onClick={resolveUpi} className="w-full mt-6 py-3 rounded-2xl bg-rose-600 text-white text-xs font-bold">Verify & continue</button>
          </div>
        )}

        {screen === 'bank_transfer' && (
          <div className="flex-1 p-5 overflow-y-auto">
            <button onClick={goHome} className="w-9 h-9 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-300">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-white mt-5">Bank Transfer</h3>
            <p className="text-xs text-zinc-500 mt-1">Prototype beneficiary lookup</p>
            <div className="space-y-3 mt-5">
              <input value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="Account number" className="w-full rounded-xl border border-zinc-700 bg-zinc-900 text-xs text-white px-3 py-3 outline-none focus:border-rose-500" />
              <input value={bankAccountConfirm} onChange={e => setBankAccountConfirm(e.target.value.replace(/\D/g, ''))} placeholder="Re-enter account number" className="w-full rounded-xl border border-zinc-700 bg-zinc-900 text-xs text-white px-3 py-3 outline-none focus:border-rose-500" />
              <input value={bankIfsc} onChange={e => setBankIfsc(e.target.value.toUpperCase())} placeholder="IFSC (e.g. SBIN0001234)" className="w-full rounded-xl border border-zinc-700 bg-zinc-900 text-xs text-white px-3 py-3 outline-none focus:border-rose-500" />
            </div>
            {pinError && <p className="text-xs text-red-400 mt-3">{pinError}</p>}
            <button onClick={resolveBankTransfer} className="w-full mt-5 py-3 rounded-2xl bg-rose-600 text-white text-xs font-bold">Continue</button>
          </div>
        )}

        {screen === 'qr' && (
          <div className="flex-1 p-5 flex flex-col">
            <div className="flex items-center gap-3">
              <button onClick={goHome} className="w-9 h-9 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-300">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-sm font-bold text-white">Scan UPI QR</h3>
                <p className="text-[10px] text-zinc-500">Camera or gallery</p>
              </div>
            </div>

            <div className="relative mt-5 flex-1 min-h-[300px] rounded-3xl border border-zinc-700 bg-black overflow-hidden flex items-center justify-center">
              {cameraActive ? (
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <div className="text-center px-8">
                  <QrCode className="w-16 h-16 text-zinc-700 mx-auto" />
                  <p className="text-xs text-zinc-500 mt-3">Camera is off</p>
                </div>
              )}
              <div className="absolute inset-10 border-2 border-rose-500/80 rounded-3xl pointer-events-none" />
            </div>

            <p className="text-[10px] text-zinc-500 text-center mt-3 min-h-[28px]">{qrMessage}</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={cameraActive ? stopCamera : startCamera} className="py-3 rounded-2xl border border-zinc-700 bg-zinc-900 text-xs text-white flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" />
                {cameraActive ? 'Stop camera' : 'Open camera'}
              </button>
              <label className="py-3 rounded-2xl border border-zinc-700 bg-zinc-900 text-xs text-white flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload QR
                <input type="file" accept="image/*" className="hidden" onChange={event => handleQrUpload(event.target.files?.[0])} />
              </label>
            </div>
          </div>
        )}

        {screen === 'amount' && selectedContact && (
          <div className="flex-1 p-5 flex flex-col">
            <button onClick={goHome} className="w-9 h-9 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-300">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center mt-5">
              <div className="w-14 h-14 rounded-full bg-zinc-800 mx-auto flex items-center justify-center text-sm font-black text-white">
                {selectedContact.initials}
              </div>
              <h3 className="text-sm font-bold text-white mt-3">{selectedContact.name}</h3>
              <p className="text-[10px] text-zinc-500 mt-1">{selectedContact.vpa}</p>
            </div>
            <div className="mt-8 text-center">
              <div className="flex items-center justify-center text-white">
                <span className="text-2xl font-bold">₹</span>
                <input
                  autoFocus
                  value={amountInput}
                  onChange={event => setAmountInput(event.target.value.replace(/[^0-9.]/g, ''))}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-44 bg-transparent text-center text-4xl font-black outline-none"
                />
              </div>
              <input
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder="Add a note (optional)"
                className="w-full mt-5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs text-white px-3 py-3 outline-none focus:border-rose-500"
              />
              {pinError && <p className="text-xs text-red-400 mt-3">{pinError}</p>}
            </div>
            <button onClick={confirmAmount} className="w-full mt-auto py-3 rounded-2xl bg-rose-600 text-white text-xs font-bold">Continue</button>
          </div>
        )}

        {screen === 'review' && (
          <div className="flex-1 p-5 flex flex-col">
            <button onClick={() => setScreen('amount')} className="w-9 h-9 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-300">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-white mt-5">Review payment</h3>
            <div className="mt-5 rounded-3xl border border-zinc-700 bg-zinc-900/70 p-4">
              <p className="text-[10px] text-zinc-500 uppercase">Paying</p>
              <p className="text-sm font-bold text-white mt-1">{transaction.receiver_name || transaction.receiver_id}</p>
              <p className="text-[10px] text-zinc-500 mt-1">{transaction.receiver_id}</p>
              <p className="text-3xl font-black text-white mt-5">₹{formatAmount(transaction.amount)}</p>
              <div className="border-t border-zinc-800 mt-5 pt-4">
                <p className="text-[10px] text-zinc-500">From</p>
                <p className="text-xs text-zinc-300 mt-1">{DEFAULT_ACCOUNT.bankName} {DEFAULT_ACCOUNT.accountMask}</p>
                {transaction.note && (
                  <>
                    <p className="text-[10px] text-zinc-500 mt-4">Note</p>
                    <p className="text-xs text-zinc-300 mt-1">{transaction.note}</p>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setPin('');
                setPinError(null);
                setScreen('payment_pin');
              }}
              className="w-full mt-auto py-3 rounded-2xl bg-rose-600 text-white text-xs font-bold"
            >
              Pay ₹{formatAmount(transaction.amount)}
            </button>
          </div>
        )}

        {screen === 'payment_pin' && renderPinPad(
          'Enter UPI PIN',
          `Authorize ₹${formatAmount(transaction.amount)} to ${transaction.receiver_name || transaction.receiver_id}.`,
          'payment',
        )}

        {screen === 'pipeline' && (
          <div className="flex-1 p-5 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-9 h-9 text-rose-400 animate-spin" />
            <h3 className="text-base font-bold text-white mt-5">Processing payment</h3>
            <p className="text-xs text-zinc-500 mt-2">
              SentinelAI is evaluating the transaction before final processing.
            </p>
            <div className="mt-6 w-full max-w-[250px] space-y-2">
              {['Transaction context', 'Risk signals', 'Decision policy', 'Authorization'].map((label, index) => (
                <div key={label} className="flex items-center gap-2 text-[10px]">
                  <span className={`w-2 h-2 rounded-full ${pipelineStep > index ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                  <span className="text-zinc-500">{label}</span>
                </div>
              ))}
            </div>
            {evaluationError && <p className="text-[9px] text-amber-400 mt-5">Backend unavailable; clearly labelled local demo scoring is being used.</p>}
          </div>
        )}

        {screen === 'risk_interstitial' && assessment && (
          <div className="flex-1 p-5 overflow-y-auto">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              assessment.risk_level === 'HIGH' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-white mt-4">
              {assessment.risk_level === 'HIGH' ? 'This payment appears high risk' : 'Payment needs verification'}
            </h3>
            <p className="text-xs text-zinc-400 mt-2">
              {assessment.risk_level === 'HIGH'
                ? 'SentinelAI recommends stopping this payment before it is processed.'
                : 'We noticed activity that differs from your usual payment pattern.'}
            </p>

            <div className={`mt-4 rounded-2xl border p-4 ${
              assessment.risk_level === 'HIGH'
                ? 'border-red-900 bg-red-950/20'
                : 'border-amber-900 bg-amber-950/20'
            }`}>
              <p className="text-2xl font-black text-white">₹{formatAmount(transaction.amount)}</p>
              <p className="text-xs text-zinc-300 mt-1">{transaction.receiver_name || transaction.receiver_id}</p>
              <p className="text-[10px] text-zinc-500">{transaction.receiver_id}</p>
            </div>

            <div className="mt-4 space-y-2">
              {assessment.reason_codes.slice(0, 3).map(code => (
                <div key={code} className="flex items-start gap-2 text-[10px] text-zinc-400">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${assessment.risk_level === 'HIGH' ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <span>{consumerReason(code)}</span>
                </div>
              ))}
            </div>

            {assessment.risk_level === 'HIGH' && (
              <div className="mt-5 space-y-2">
                <select
                  value={reportReason}
                  onChange={event => setReportReason(event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 px-3 py-2.5"
                >
                  <option>Suspected scam</option>
                  <option>Impersonation</option>
                  <option>Fraudulent payment request</option>
                  <option>Other</option>
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={submitHighRiskReport}
                    disabled={reportState === 'loading'}
                    className="py-2.5 rounded-xl border border-red-800 bg-red-950/20 text-[10px] font-bold text-red-300 flex items-center justify-center gap-1.5"
                  >
                    {reportState === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
                    Report receiver
                  </button>
                  <button
                    onClick={blockCurrentReceiver}
                    className="py-2.5 rounded-xl border border-red-800 bg-red-950/20 text-[10px] font-bold text-red-300 flex items-center justify-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Block receiver
                  </button>
                </div>

                {reportMessage && (
                  <p className={`text-[10px] ${reportState === 'error' ? 'text-red-400' : 'text-zinc-400'}`}>{reportMessage}</p>
                )}

                <label className="flex items-start gap-2 mt-3 text-[10px] text-zinc-400">
                  <input
                    type="checkbox"
                    checked={highRiskAcknowledged}
                    onChange={event => setHighRiskAcknowledged(event.target.checked)}
                    className="mt-0.5"
                  />
                  I recognize this receiver and understand SentinelAI recommends cancelling the payment.
                </label>
              </div>
            )}

            <div className="space-y-2 mt-6">
              <button onClick={cancelRiskPayment} className="w-full py-3 rounded-2xl bg-white text-black text-xs font-bold">Cancel payment</button>
              <button
                disabled={assessment.risk_level === 'HIGH' && !highRiskAcknowledged}
                onClick={() => {
                  setPin('');
                  setPinError(null);
                  setScreen('stepup_pin');
                }}
                className={`w-full py-3 rounded-2xl text-xs font-bold border ${
                  assessment.risk_level === 'HIGH'
                    ? 'border-red-700 text-red-300 disabled:opacity-40'
                    : 'border-amber-700 text-amber-300'
                }`}
              >
                {assessment.risk_level === 'HIGH' ? 'Continue with verification' : 'Verify and continue'}
              </button>
            </div>
          </div>
        )}

        {screen === 'stepup_pin' && renderPinPad(
          'Verify UPI PIN again',
          assessment?.risk_level === 'HIGH'
            ? 'Required because you chose to continue a payment SentinelAI recommends stopping.'
            : 'Required before this unusual payment can continue.',
          'stepup',
        )}

        {screen === 'result' && lastReceipt && (
          <div className="flex-1 p-5 flex flex-col overflow-y-auto">
            <div className="flex-1 flex flex-col items-center text-center pt-8">
              <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-black text-white mt-4">Payment processed</h3>
              <p className="text-3xl font-black text-white mt-5">₹{formatAmount(lastReceipt.amount)}</p>
              <p className="text-sm font-semibold text-zinc-300 mt-2">{lastReceipt.recipientName}</p>
              <p className="text-[10px] text-zinc-500 mt-1">{lastReceipt.recipientId}</p>

              <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 mt-6 text-left space-y-3">
                <div>
                  <p className="text-[9px] text-zinc-500">UPI transaction ID</p>
                  <p className="text-[11px] font-mono text-zinc-200 mt-0.5">{lastReceipt.upiTransactionId}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-500">Reference number</p>
                  <p className="text-[11px] font-mono text-zinc-200 mt-0.5">{lastReceipt.referenceNumber}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-500">Date & time</p>
                  <p className="text-[11px] text-zinc-200 mt-0.5">{formatTime(lastReceipt.timestamp)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-500">Paid from</p>
                  <p className="text-[11px] text-zinc-200 mt-0.5">{lastReceipt.bankName} {lastReceipt.accountMask}</p>
                </div>
              </div>
            </div>

            {shareMessage && <p className="text-[10px] text-zinc-500 text-center mt-3">{shareMessage}</p>}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={() => shareReceipt(lastReceipt)} className="py-3 rounded-2xl border border-zinc-700 text-xs font-bold text-zinc-200 flex items-center justify-center gap-1.5">
                <Share2 className="w-4 h-4" />
                Share receipt
              </button>
              <button
                onClick={() => {
                  onReset();
                  setLastReceipt(null);
                  goHome();
                }}
                className="py-3 rounded-2xl bg-rose-600 text-xs font-bold text-white"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {screen === 'activity' && (
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="flex items-center gap-3">
              <button onClick={goHome} className="w-9 h-9 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-300">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-sm font-bold text-white">Recent activity</h3>
                <p className="text-[10px] text-zinc-500">Amounts are protected by UPI PIN</p>
              </div>
            </div>
            <div className="space-y-2 mt-5">
              {history.map(record => (
                <button key={record.id} onClick={() => openRecentRecord(record)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 flex items-center justify-between text-left">
                  <div>
                    <p className="text-xs font-semibold text-white">{record.recipientName}</p>
                    <p className="text-[9px] text-zinc-500 mt-1">{formatTime(record.timestamp)} · {record.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-zinc-400">₹ ••••</p>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 ml-auto mt-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === 'activity_pin' && renderPinPad(
          'Enter UPI PIN',
          'Transaction amounts and payment references are protected.',
          'activity',
        )}

        {screen === 'activity_detail' && selectedRecord && (
          <div className="flex-1 p-5 overflow-y-auto">
            <button onClick={() => setScreen('activity')} className="w-9 h-9 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-300">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center mt-5">
              <ReceiptText className="w-9 h-9 text-emerald-400 mx-auto" />
              <p className="text-2xl font-black text-white mt-3">₹{formatAmount(selectedRecord.amount)}</p>
              <p className="text-sm font-semibold text-zinc-300 mt-2">{selectedRecord.recipientName}</p>
              <p className="text-[10px] text-zinc-500">{selectedRecord.recipientId}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 mt-5 space-y-3">
              <div><p className="text-[9px] text-zinc-500">Status</p><p className="text-xs text-zinc-200">{selectedRecord.status}</p></div>
              <div><p className="text-[9px] text-zinc-500">UPI transaction ID</p><p className="text-xs font-mono text-zinc-200">{selectedRecord.upiTransactionId}</p></div>
              <div><p className="text-[9px] text-zinc-500">Reference number</p><p className="text-xs font-mono text-zinc-200">{selectedRecord.referenceNumber}</p></div>
              <div><p className="text-[9px] text-zinc-500">Date & time</p><p className="text-xs text-zinc-200">{formatTime(selectedRecord.timestamp)}</p></div>
              <div><p className="text-[9px] text-zinc-500">Paid from</p><p className="text-xs text-zinc-200">{selectedRecord.bankName} {selectedRecord.accountMask}</p></div>
              {selectedRecord.note && <div><p className="text-[9px] text-zinc-500">Note</p><p className="text-xs text-zinc-200">{selectedRecord.note}</p></div>}
            </div>
            <button onClick={() => shareReceipt(selectedRecord)} className="w-full mt-4 py-3 rounded-2xl border border-zinc-700 text-xs font-bold text-zinc-200 flex items-center justify-center gap-1.5">
              <Share2 className="w-4 h-4" />
              Share receipt
            </button>
          </div>
        )}

        {screen === 'demo_lab' && (
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="flex items-center gap-3">
              <button onClick={goHome} className="w-9 h-9 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-300">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-sm font-bold text-white">SentinelAI Demo Lab</h3>
                <p className="text-[10px] text-zinc-500">Controlled scenarios for presentations</p>
              </div>
            </div>
            <div className="space-y-3 mt-5">
              {DEMO_SCENARIOS.map(scenario => {
                const tone = scenario.accent === 'red'
                  ? 'border-red-900 bg-red-950/20'
                  : scenario.accent === 'amber'
                    ? 'border-amber-900 bg-amber-950/20'
                    : 'border-emerald-900 bg-emerald-950/20';
                return (
                  <div key={scenario.id} className={`rounded-2xl border p-4 ${tone}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-white">{scenario.title}</p>
                        <p className="text-[10px] text-zinc-500 mt-1">{scenario.subtitle}</p>
                        <p className="text-[10px] text-zinc-400 mt-2">
                          {scenario.payee.name} · ₹{scenario.payee.defaultAmount.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <button onClick={() => runDemo(scenario)} className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-white">
                        Run
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-zinc-600 text-center mt-5">
              Demo fixtures use the same payment authorization and SentinelAI evaluation flow as ordinary payments.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={() => {
          onReset();
          setLastReceipt(null);
          setSelectedContact(null);
          setAmountInput('');
          setNote('');
          setHighRiskAcknowledged(false);
          setReportState('idle');
          setReportMessage('');
          goHome();
        }}
        className="mt-4 text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset simulator
      </button>
    </div>
  );
};
