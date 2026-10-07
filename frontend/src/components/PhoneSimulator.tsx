import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  Battery,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Delete,
  Eye,
  Flag,
  Loader2,
  Lock,
  Phone,
  QrCode,
  Search,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Upload,
  Users,
  Wallet,
  Wifi,
} from 'lucide-react';
import {
  DEFAULT_ACCOUNT,
  DEMO_SCENARIOS,
  INITIAL_RECENT_ACTIVITY,
  UPI_CONTACTS,
} from '../data/mockData';
import { reportReceiver } from '../services/apiClient';
import {
  DemoScenario,
  PaymentMethod,
  PaymentRecord,
  RiskAssessment,
  SharedTransaction,
  UpiContact,
} from '../types/sentinel';

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

type Screen =
  | 'home'
  | 'contacts'
  | 'phone'
  | 'upi'
  | 'bank'
  | 'qr'
  | 'amount'
  | 'review'
  | 'pin'
  | 'balance'
  | 'pipeline'
  | 'risk'
  | 'result'
  | 'history'
  | 'history_detail'
  | 'demo'
  | 'report';

type PinPurpose = 'balance' | 'payment' | 'stepup' | 'history';

interface Recipient {
  name: string;
  id: string;
  receiverType: string;
  verified: boolean;
  initials: string;
}

interface DetectorResult {
  rawValue?: string;
}

interface Detector {
  detect(source: ImageBitmap | HTMLVideoElement): Promise<DetectorResult[]>;
}

interface DetectorCtor {
  new (options?: { formats?: string[] }): Detector;
}

const UPI_PIN = '4092';
const BALANCE_KEY = 'sentinelai.upi.balance';
const HISTORY_KEY = 'sentinelai.upi.history';
const BLOCKED_KEY = 'sentinelai.upi.blocked';

const money = (value: number) =>
  '₹' +
  value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const generateDigits = (length: number) =>
  Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');

const generateTransactionId = () =>
  'TXN-UPI-' +
  Math.floor(100000 + Math.random() * 900000) +
  '-' +
  Math.floor(1000 + Math.random() * 9000);

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const friendlyReason = (code: string) => {
  const reasons: Record<string, string> = {
    HIGH_ANOMALY: 'This payment pattern is unusual compared with your recent activity.',
    HIGH_TRANSACTION_VELOCITY: 'The amount or payment frequency is much higher than usual.',
    NEW_RECEIVER: 'You have little or no payment history with this receiver.',
    UNKNOWN_RECEIVER_TYPE: 'The receiver category could not be fully verified.',
    UNUSUAL_AMOUNT: 'The amount is outside your usual payment range.',
    NEW_DEVICE: 'This payment is coming from an unfamiliar device context.',
    NEW_LOCATION: 'This payment is coming from a new location.',
    UNUSUAL_HOUR: 'This payment is happening at an unusual time.',
    SUSPICIOUS_RECEIVER: 'The receiver context has elevated risk.',
    BEHAVIORAL_DEVIATION: 'The payment context differs from your usual behaviour.',
    UNUSUAL_AMOUNT_SURGE: 'The amount is significantly higher than your usual payments.',
    EMULATOR_DEVICE_DETECTED: 'The device environment could not be fully trusted.',
  };
  return reasons[code] || code.replaceAll('_', ' ').toLowerCase();
};

const BackBar: React.FC<{ title: string; onBack: () => void }> = ({
  title,
  onBack,
}) => (
  <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
    <button
      type="button"
      onClick={onBack}
      className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
    <div>
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <p className="text-[9px] text-zinc-500">BharatPay • protected by SentinelAI</p>
    </div>
  </div>
);

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
  const [screen, setScreen] = useState<Screen>('home');
  const [method, setMethod] = useState<PaymentMethod>('CONTACT');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [pin, setPin] = useState('');
  const [pinPurpose, setPinPurpose] = useState<PinPurpose>('payment');
  const [error, setError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<PaymentRecord | null>(
    null,
  );
  const [lastReceipt, setLastReceipt] = useState<PaymentRecord | null>(null);
  const [reportReason, setReportReason] = useState('Suspected scam');
  const [reportMessage, setReportMessage] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem(BALANCE_KEY);
    return saved ? Number(saved) : DEFAULT_ACCOUNT.balance;
  });

  const [history, setHistory] = useState<PaymentRecord[]>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null') ||
        INITIAL_RECENT_ACTIVITY
      );
    } catch {
      return INITIAL_RECENT_ACTIVITY;
    }
  });

  const [blocked, setBlocked] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(BLOCKED_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const filteredContacts = useMemo(() => {
    const query = search.toLowerCase().trim();
    return UPI_CONTACTS.filter(
      (contact) =>
        !query ||
        contact.name.toLowerCase().includes(query) ||
        contact.vpa.toLowerCase().includes(query) ||
        contact.phone.includes(query),
    );
  }, [search]);

  const saveHistory = (next: PaymentRecord[]) => {
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const saveBalance = (next: number) => {
    setBalance(next);
    localStorage.setItem(BALANCE_KEY, String(next));
  };

  const saveBlocked = (next: string[]) => {
    setBlocked(next);
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(next));
  };

  const stopCamera = () => {
    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (!isProcessing && assessment && screen === 'pipeline') {
      if (assessment.risk_level === 'LOW') {
        completePayment(assessment);
      } else {
        setShowWhy(false);
        setAcknowledged(false);
        setScreen('risk');
      }
    }
  }, [assessment, isProcessing, screen]);

  const resetFlow = () => {
    stopCamera();
    setScreen('home');
    setRecipient(null);
    setAmount('');
    setNote('');
    setPin('');
    setPinError(null);
    setError(null);
    setShowWhy(false);
    setAcknowledged(false);
    setReportMessage('');
    onReset();
  };

  const selectRecipient = (
    next: Recipient,
    nextMethod: PaymentMethod,
    defaults?: { amount?: number; note?: string; risk?: 'low' | 'medium' | 'high' },
  ) => {
    stopCamera();
    if (blocked.includes(next.id)) {
      setError(
        'This receiver is blocked. Unblock them from Contacts before making a payment.',
      );
      setScreen('contacts');
      return;
    }

    const isHigh = defaults?.risk === 'high';
    const isMedium = defaults?.risk === 'medium';

    setRecipient(next);
    setMethod(nextMethod);
    setAmount(defaults?.amount ? String(defaults.amount) : '');
    setNote(defaults?.note || '');
    setError(null);
    onReset();

    setTransaction((previous) => ({
      ...previous,
      transaction_id: generateTransactionId(),
      amount: defaults?.amount || 0,
      receiver_id: next.id,
      receiver_name: next.name,
      receiver_type: next.receiverType,
      timestamp: new Date().toISOString(),
      device_id: isHigh
        ? 'DEV_ROOTED_EMU_X86'
        : isMedium
          ? 'DEV_NEW_ANDROID_14'
          : 'DEV_APPL_IPHONE_15_PRO_ENCLAVE',
      device_type: isHigh
        ? 'android_emulator'
        : isMedium
          ? 'new_device'
          : 'ios',
      note: defaults?.note || '',
    }));

    setScreen(defaults?.amount ? 'review' : 'amount');
  };

  const selectContact = (contact: UpiContact, nextMethod: PaymentMethod) =>
    selectRecipient(
      {
        name: contact.name,
        id: contact.vpa,
        receiverType: contact.receiver_type,
        verified: contact.verified,
        initials: contact.initials,
      },
      nextMethod,
    );

  const continueAmount = () => {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    if (numeric > 100000) {
      setError('Prototype UPI limit is ₹1,00,000 per payment.');
      return;
    }
    if (numeric > balance) {
      setError('Insufficient balance for this payment.');
      return;
    }
    setTransaction((previous) => ({
      ...previous,
      amount: numeric,
      note,
      timestamp: new Date().toISOString(),
      transaction_id: generateTransactionId(),
    }));
    setError(null);
    setScreen('review');
  };

  const openPin = (purpose: PinPurpose) => {
    setPinPurpose(purpose);
    setPin('');
    setPinError(null);
    setScreen('pin');
  };

  const pressPin = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setPinError(null);
    if (next.length === 4) {
      window.setTimeout(() => verifyPin(next), 120);
    }
  };

  const verifyPin = (candidate: string) => {
    if (candidate !== UPI_PIN) {
      setPin('');
      setPinError('Incorrect UPI PIN');
      onLogEvent?.('UPI_PIN_FAILED', { purpose: pinPurpose });
      return;
    }

    onLogEvent?.('UPI_PIN_VERIFIED', { purpose: pinPurpose });

    if (pinPurpose === 'balance') {
      setScreen('balance');
      return;
    }

    if (pinPurpose === 'history') {
      setScreen('history_detail');
      return;
    }

    if (pinPurpose === 'payment') {
      const nextTransaction: SharedTransaction = {
        ...transaction,
        amount: Number(amount || transaction.amount),
        note,
        timestamp: new Date().toISOString(),
      };
      setTransaction(nextTransaction);
      setScreen('pipeline');
      onExecuteTransaction(nextTransaction);
      return;
    }

    if (assessment?.risk_level === 'HIGH' && !acknowledged) {
      setPin('');
      setPinError('Confirm that you understand the warning before continuing.');
      return;
    }

    completePayment(assessment);
  };

  const createRecord = (
    status: PaymentRecord['status'],
    currentAssessment: RiskAssessment | null,
  ): PaymentRecord => ({
    id: 'payment-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    transactionId: transaction.transaction_id,
    upiTransactionId: generateDigits(12),
    referenceNumber: generateDigits(12),
    recipientName:
      recipient?.name || transaction.receiver_name || transaction.receiver_id,
    recipientId: recipient?.id || transaction.receiver_id,
    amount: Number(amount || transaction.amount),
    currency: 'INR',
    timestamp: new Date().toISOString(),
    status,
    method,
    bankName: DEFAULT_ACCOUNT.bankName,
    accountMask: DEFAULT_ACCOUNT.accountMask,
    note,
    decision: currentAssessment?.decision,
    riskScore: currentAssessment?.composite_score,
  });

  const completePayment = (currentAssessment: RiskAssessment | null) => {
    const record = createRecord('Payment processed', currentAssessment);
    saveBalance(Math.max(0, balance - record.amount));
    saveHistory([record, ...history].slice(0, 25));
    setLastReceipt(record);
    setPin('');
    setScreen('result');
    onLogEvent?.('PAYMENT_PROCESSED', {
      transaction_id: record.transactionId,
      upi_transaction_id: record.upiTransactionId,
      original_decision: currentAssessment?.decision,
      high_risk_acknowledged:
        currentAssessment?.risk_level === 'HIGH' ? acknowledged : false,
    });
  };

  const cancelRiskPayment = () => {
    const record = createRecord('Cancelled', assessment);
    saveHistory([record, ...history].slice(0, 25));
    resetFlow();
  };

  const blockReceiver = () => {
    if (!recipient) return;
    const next = blocked.includes(recipient.id)
      ? blocked
      : [...blocked, recipient.id];
    saveBlocked(next);
    const record = createRecord('Blocked', assessment);
    saveHistory([record, ...history].slice(0, 25));
    onLogEvent?.('RECEIVER_BLOCKED', { receiver_id: recipient.id });
    setError(
      recipient.name +
        ' is blocked. Payments to this receiver are disabled until you unblock them.',
    );
    setScreen('home');
    onReset();
  };

  const submitReport = async () => {
    if (!recipient || !assessment) return;
    setReportBusy(true);
    setReportMessage('');
    const result = await reportReceiver({
      sender_id: transaction.user_id,
      receiver_id: recipient.id,
      risk_score: assessment.composite_score,
      reason: reportReason,
      transaction_context: {
        transaction_id: transaction.transaction_id,
        receiver_name: recipient.name,
        amount: transaction.amount,
        currency: transaction.currency,
        payment_method: method,
        note,
      },
    });
    setReportBusy(false);
    setReportMessage(
      result.ok && result.reportId
        ? 'Report submitted. Reference ' + result.reportId
        : result.message,
    );
    if (result.ok) {
      onLogEvent?.('RECEIVER_REPORTED', {
        receiver_id: recipient.id,
        report_id: result.reportId || '',
        reason: reportReason,
      });
    }
  };

  const resolvePhone = () => {
    const normalized = phone.replace(/\D/g, '').slice(-10);
    const contact = UPI_CONTACTS.find(
      (item) => item.phone.slice(-10) === normalized,
    );
    if (!contact) {
      setError('No UPI account found for that phone number in this prototype.');
      return;
    }
    selectContact(contact, 'PHONE');
  };

  const resolveUpi = () => {
    const value = upiId.trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,}@[a-z0-9._-]{2,}$/i.test(value)) {
      setError('Enter a valid UPI ID, for example name@oksbi.');
      return;
    }
    const contact = UPI_CONTACTS.find(
      (item) => item.vpa.toLowerCase() === value,
    );
    if (contact) {
      selectContact(contact, 'UPI_ID');
      return;
    }
    selectRecipient(
      {
        name: value.split('@')[0].replace(/[._-]/g, ' '),
        id: value,
        receiverType: 'user',
        verified: false,
        initials: value.slice(0, 2).toUpperCase(),
      },
      'UPI_ID',
    );
  };

  const resolveBank = () => {
    if (
      accountNumber.length < 8 ||
      accountNumber !== confirmAccountNumber
    ) {
      setError('Account numbers must match and contain at least 8 digits.');
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc.trim())) {
      setError('Enter a valid IFSC code.');
      return;
    }
    selectRecipient(
      {
        name: 'Bank beneficiary ••' + accountNumber.slice(-4),
        id: accountNumber + '@' + ifsc.toUpperCase(),
        receiverType: 'bank_account',
        verified: true,
        initials: 'BT',
      },
      'BANK_TRANSFER',
    );
  };

  const parseUpiQr = (raw: string) => {
    try {
      const uri = new URL(raw.trim());
      if (uri.protocol !== 'upi:') throw new Error('Not a UPI payment QR.');
      const payee = uri.searchParams.get('pa');
      if (!payee) throw new Error('UPI QR does not contain a payee address.');
      const name = uri.searchParams.get('pn') || payee.split('@')[0];
      const qrAmount = Number(uri.searchParams.get('am') || 0);
      const qrNote = uri.searchParams.get('tn') || '';
      const known = UPI_CONTACTS.find(
        (item) => item.vpa.toLowerCase() === payee.toLowerCase(),
      );
      const nextRecipient: Recipient = known
        ? {
            name: known.name,
            id: known.vpa,
            receiverType: known.receiver_type,
            verified: known.verified,
            initials: known.initials,
          }
        : {
            name,
            id: payee,
            receiverType: 'merchant',
            verified: false,
            initials: name.slice(0, 2).toUpperCase(),
          };

      if (blocked.includes(nextRecipient.id)) {
        stopCamera();
        setQrError('This QR belongs to a blocked receiver.');
        return;
      }

      setRecipient(nextRecipient);
      setMethod('QR');
      setAmount(qrAmount > 0 ? String(qrAmount) : '');
      setNote(qrNote);
      setTransaction((previous) => ({
        ...previous,
        transaction_id: generateTransactionId(),
        receiver_id: nextRecipient.id,
        receiver_name: nextRecipient.name,
        receiver_type: nextRecipient.receiverType,
        amount: qrAmount > 0 ? qrAmount : 0,
        note: qrNote,
        timestamp: new Date().toISOString(),
      }));
      stopCamera();
      setQrError(null);
      setScreen('amount');
    } catch (err: unknown) {
      setQrError(
        err instanceof Error ? err.message : 'Unable to read this QR code.',
      );
    }
  };

  const getDetector = () => {
    const Ctor = (
      window as unknown as { BarcodeDetector?: DetectorCtor }
    ).BarcodeDetector;
    if (!Ctor) return null;
    if (!detectorRef.current) {
      detectorRef.current = new Ctor({ formats: ['qr_code'] });
    }
    return detectorRef.current;
  };

  const startCamera = async () => {
    setQrError(null);
    const detector = getDetector();
    if (!detector) {
      setQrError(
        'QR decoding is not supported by this browser. Use Upload from gallery or Pay by UPI ID.',
      );
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraOn(true);
      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (results[0]?.rawValue) parseUpiQr(results[0].rawValue);
        } catch {
          // Keep scanning. Individual frames can fail without ending the session.
        }
      }, 500);
    } catch (err: unknown) {
      setQrError(
        err instanceof Error ? err.message : 'Camera permission was denied.',
      );
    }
  };

  const scanUploadedQr = async (file: File) => {
    setQrError(null);
    const detector = getDetector();
    if (!detector) {
      setQrError(
        'This browser cannot decode QR images locally. Use a Chromium browser or Pay by UPI ID.',
      );
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      bitmap.close();
      if (!results[0]?.rawValue) {
        throw new Error('No QR code was detected in that image.');
      }
      parseUpiQr(results[0].rawValue);
    } catch (err: unknown) {
      setQrError(
        err instanceof Error ? err.message : 'Unable to decode that QR image.',
      );
    }
  };

  const shareReceipt = async (record: PaymentRecord) => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1080;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = '#09090b';
    context.fillRect(0, 0, 900, 1080);
    context.fillStyle = '#22c55e';
    context.beginPath();
    context.arc(450, 150, 52, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.font = 'bold 40px sans-serif';
    context.fillText('Payment processed', 450, 260);
    context.font = 'bold 58px sans-serif';
    context.fillText(money(record.amount), 450, 350);
    context.font = '30px sans-serif';
    context.fillStyle = '#d4d4d8';
    context.fillText(record.recipientName, 450, 410);
    context.font = '22px monospace';
    context.fillStyle = '#a1a1aa';
    context.fillText(record.recipientId, 450, 452);

    context.textAlign = 'left';
    const rows = [
      ['Date & time', formatDateTime(record.timestamp)],
      ['Paid from', record.bankName + ' ' + record.accountMask],
      ['UPI transaction ID', record.upiTransactionId],
      ['Reference number', record.referenceNumber],
    ];
    rows.forEach(([label, value], index) => {
      const y = 590 + index * 110;
      context.fillStyle = '#71717a';
      context.font = '20px sans-serif';
      context.fillText(label, 100, y);
      context.fillStyle = '#f4f4f5';
      context.font = '24px sans-serif';
      context.fillText(value, 100, y + 35);
    });

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File(
        [blob],
        'upi-receipt-' + record.upiTransactionId + '.png',
        { type: 'image/png' },
      );
      const nav = navigator as Navigator & {
        share?: (data: {
          title?: string;
          text?: string;
          files?: File[];
        }) => Promise<void>;
      };
      if (nav.share) {
        try {
          await nav.share({
            title: 'UPI payment receipt',
            text:
              money(record.amount) + ' paid to ' + record.recipientName,
            files: [file],
          });
          return;
        } catch {
          // Falling back to download is intentional if native sharing is cancelled/unsupported.
        }
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };

  const runDemo = (scenario: DemoScenario) => {
    selectRecipient(
      {
        name: scenario.payee.name,
        id: scenario.payee.vpa,
        receiverType: scenario.payee.receiver_type,
        verified: scenario.payee.verified,
        initials: scenario.payee.initials,
      },
      'DEMO',
      {
        amount: scenario.payee.defaultAmount,
        note: scenario.payee.defaultNote,
        risk: scenario.payee.presetRisk,
      },
    );
  };

  const borderClass =
    assessment && ['risk', 'result', 'pin'].includes(screen)
      ? assessment.risk_level === 'LOW'
        ? 'phone-glow-green'
        : assessment.risk_level === 'MEDIUM'
          ? 'phone-glow-amber'
          : 'phone-glow-crimson'
      : 'phone-glow-default';

  const renderPin = () => {
    const title =
      pinPurpose === 'balance'
        ? 'Check bank balance'
        : pinPurpose === 'history'
          ? 'View payment details'
          : pinPurpose === 'stepup'
            ? 'Verify this payment'
            : 'Enter UPI PIN';

    return (
      <div className="flex-1 p-5 flex flex-col">
        <BackBar
          title={title}
          onBack={() =>
            setScreen(
              pinPurpose === 'stepup'
                ? 'risk'
                : pinPurpose === 'payment'
                  ? 'review'
                  : 'home',
            )
          }
        />
        <div className="flex-1 flex flex-col justify-center text-center">
          <Lock className="w-7 h-7 text-rose-400 mx-auto mb-3" />
          <p className="text-xs text-zinc-400">
            {pinPurpose === 'balance'
              ? DEFAULT_ACCOUNT.bankName + ' ' + DEFAULT_ACCOUNT.accountMask
              : pinPurpose === 'history'
                ? 'Verify to reveal the transaction amount'
                : recipient
                  ? money(Number(amount || transaction.amount)) +
                    ' • ' +
                    recipient.name
                  : 'Secure verification'}
          </p>
          <div className="flex justify-center gap-3 my-5">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={
                  'w-3 h-3 rounded-full border ' +
                  (index < pin.length
                    ? 'bg-rose-500 border-rose-500'
                    : 'bg-zinc-900 border-zinc-600')
                }
              />
            ))}
          </div>
          {pinError && (
            <p className="text-xs text-red-400 mb-3">{pinError}</p>
          )}
          <div className="grid grid-cols-3 gap-3 max-w-[250px] mx-auto w-full">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map(
              (key, index) =>
                key ? (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      key === 'back'
                        ? setPin((current) => current.slice(0, -1))
                        : pressPin(key)
                    }
                    className="h-12 rounded-2xl border border-zinc-700 bg-zinc-900 text-white text-lg font-semibold"
                  >
                    {key === 'back' ? (
                      <Delete className="w-5 h-5 mx-auto" />
                    ) : (
                      key
                    )}
                  </button>
                ) : (
                  <span key={index} />
                ),
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderReceipt = (record: PaymentRecord, detailed = false) => (
    <div className="flex-1 p-5 overflow-y-auto">
      <BackBar
        title={detailed ? 'Payment details' : 'Receipt'}
        onBack={detailed ? () => setScreen('home') : resetFlow}
      />
      <div className="text-center pt-7">
        {!detailed && (
          <div className="w-14 h-14 rounded-full bg-emerald-500 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
        )}
        <h2 className="text-lg font-black text-white mt-3">
          {detailed ? record.status : 'Payment processed'}
        </h2>
        <p className="text-3xl font-black text-white mt-3">
          {money(record.amount)}
        </p>
        <p className="text-sm text-zinc-300 mt-2">{record.recipientName}</p>
        <p className="text-[10px] text-zinc-500 font-mono">
          {record.recipientId}
        </p>
      </div>
      <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 text-[10px]">
        {[
          ['Date & time', formatDateTime(record.timestamp)],
          ['Paid from', record.bankName + ' ' + record.accountMask],
          ['UPI transaction ID', record.upiTransactionId],
          ['Reference number', record.referenceNumber],
          ...(detailed ? [['Note', record.note || '—']] : []),
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-zinc-500">{label}</span>
            <span className="text-zinc-200 text-right font-mono">{value}</span>
          </div>
        ))}
      </div>
      {record.status === 'Payment processed' && (
        <button
          type="button"
          onClick={() => shareReceipt(record)}
          className="w-full mt-4 rounded-2xl border border-zinc-700 py-3 text-xs font-semibold text-white flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share receipt
        </button>
      )}
      <button
        type="button"
        onClick={resetFlow}
        className="w-full mt-2 rounded-2xl bg-white py-3 text-xs font-bold text-zinc-950"
      >
        Done
      </button>
    </div>
  );

  return (
    <div className="flex flex-col items-center">
      <div
        className={
          'relative w-[360px] sm:w-[380px] h-[760px] rounded-[48px] bg-[var(--phone-bg)] border-[6px] overflow-hidden flex flex-col shadow-2xl ' +
          borderClass
        }
      >
        <div className="px-6 pt-3.5 pb-2 flex items-center justify-between text-xs border-b border-zinc-800 bg-[var(--phone-header)]">
          <span className="font-bold">9:41</span>
          <div className="w-24 h-4 rounded-full bg-black" />
          <span className="flex gap-1 text-zinc-300">
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4" />
          </span>
        </div>

        {screen === 'home' && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-5">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-[.18em]">
                  BharatPay
                </p>
                <h2 className="text-lg font-black text-white">Good evening</h2>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-700 flex items-center justify-center text-xs font-bold">
                TE
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-amber-800 bg-amber-950/30 p-3 text-[10px] text-amber-200">
                {error}
              </div>
            )}

            <div className="rounded-3xl p-4 border border-zinc-700 bg-zinc-900 mb-5">
              <div className="flex justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500">Linked bank account</p>
                  <p className="text-sm font-bold text-white">
                    {DEFAULT_ACCOUNT.bankName}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {DEFAULT_ACCOUNT.accountMask}
                  </p>
                </div>
                <Building2 className="w-5 h-5 text-rose-400" />
              </div>
              <div className="mt-4 flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-zinc-500">Available balance</p>
                  <p className="text-xl font-black text-white">₹ ••••••</p>
                </div>
                <button
                  type="button"
                  onClick={() => openPin('balance')}
                  className="px-3 py-2 rounded-xl bg-white text-zinc-950 text-[10px] font-bold flex gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Check balance
                </button>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 uppercase tracking-[.18em] mb-3">
              Pay
            </p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { icon: QrCode, label: 'Scan QR', screen: 'qr' as Screen },
                { icon: Users, label: 'Contacts', screen: 'contacts' as Screen },
                { icon: Phone, label: 'Phone', screen: 'phone' as Screen },
                { icon: Send, label: 'UPI ID', screen: 'upi' as Screen },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setError(null);
                    setScreen(item.screen);
                  }}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/70 py-3 flex flex-col items-center gap-2"
                >
                  <item.icon className="w-5 h-5 text-rose-400" />
                  <span className="text-[9px] text-zinc-200">{item.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setScreen('bank')}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 flex items-center justify-between mb-5"
            >
              <span className="flex gap-3 items-center text-left">
                <CreditCard className="w-4 h-4 text-zinc-400" />
                <span>
                  <b className="block text-xs text-white">Bank transfer</b>
                  <small className="text-[9px] text-zinc-500">
                    Account number + IFSC
                  </small>
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </button>

            <div className="flex justify-between mb-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-[.18em]">
                Recent contacts
              </p>
              <button
                type="button"
                onClick={() => setScreen('contacts')}
                className="text-[9px] text-rose-400"
              >
                View all
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto mb-4">
              {UPI_CONTACTS.slice(0, 5).map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => selectContact(contact, 'CONTACT')}
                  className="w-[60px] flex-shrink-0 text-center"
                >
                  <span className="w-11 h-11 mx-auto rounded-2xl bg-zinc-800 flex items-center justify-center text-xs font-bold">
                    {contact.initials}
                  </span>
                  <span className="block text-[9px] text-zinc-400 truncate mt-1">
                    {contact.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-between mb-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-[.18em]">
                Recent activity
              </p>
              <button
                type="button"
                onClick={() => setScreen('history')}
                className="text-[9px] text-rose-400"
              >
                View all
              </button>
            </div>
            <div className="space-y-2 mb-5">
              {history.slice(0, 3).map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => {
                    setSelectedHistory(record);
                    openPin('history');
                  }}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 flex justify-between text-left"
                >
                  <span>
                    <b className="block text-xs text-white">
                      {record.recipientName}
                    </b>
                    <small className="text-[9px] text-zinc-500">
                      {formatDateTime(record.timestamp)} • {record.status}
                    </small>
                  </span>
                  <span className="text-xs font-mono">₹ ••••</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setScreen('demo')}
              className="w-full rounded-2xl border border-rose-900/60 bg-rose-950/20 p-3 flex justify-between items-center"
            >
              <span className="flex gap-2 items-center">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span className="text-left">
                  <b className="block text-xs text-white">SentinelAI Demo Lab</b>
                  <small className="text-[9px] text-zinc-500">
                    Controlled LOW / MEDIUM / HIGH fixtures
                  </small>
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </button>
          </div>
        )}

        {screen === 'balance' && (
          <div className="flex-1 p-5">
            <BackBar title="Bank balance" onBack={resetFlow} />
            <div className="h-full -mt-12 flex flex-col items-center justify-center">
              <Wallet className="w-8 h-8 text-emerald-400 mb-3" />
              <p className="text-[10px] text-zinc-500">
                {DEFAULT_ACCOUNT.bankName} {DEFAULT_ACCOUNT.accountMask}
              </p>
              <p className="text-3xl font-black text-white mt-2">
                {money(balance)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-3">
                Revealed only after correct UPI PIN verification.
              </p>
            </div>
          </div>
        )}

        {screen === 'contacts' && (
          <div className="flex-1 p-5 overflow-y-auto">
            <BackBar title="Pay a contact" onBack={resetFlow} />
            <div className="relative mt-4">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-zinc-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone or UPI ID"
                className="w-full rounded-2xl bg-zinc-900 border border-zinc-700 py-3 pl-9 pr-3 text-xs text-white"
              />
            </div>
            {error && <p className="text-[10px] text-amber-300 my-3">{error}</p>}
            <div className="space-y-2 mt-3">
              {filteredContacts.map((contact) => {
                const isBlocked = blocked.includes(contact.vpa);
                return (
                  <div
                    key={contact.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 flex items-center gap-3"
                  >
                    <button
                      type="button"
                      disabled={isBlocked}
                      onClick={() => selectContact(contact, 'CONTACT')}
                      className="flex-1 flex gap-3 items-center text-left disabled:opacity-40"
                    >
                      <span className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xs font-bold">
                        {contact.initials}
                      </span>
                      <span>
                        <b className="block text-xs text-white">
                          {contact.name} {contact.verified ? '✓' : ''}
                        </b>
                        <small className="text-[9px] text-zinc-500">
                          {contact.vpa}
                        </small>
                      </span>
                    </button>
                    {isBlocked ? (
                      <button
                        type="button"
                        onClick={() =>
                          saveBlocked(blocked.filter((item) => item !== contact.vpa))
                        }
                        className="text-[9px] text-red-300 border border-red-800 rounded-lg px-2 py-1"
                      >
                        Unblock
                      </button>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {screen === 'phone' && (
          <div className="flex-1 p-5">
            <BackBar title="Pay by phone number" onBack={resetFlow} />
            <div className="mt-8">
              <div className="rounded-2xl bg-zinc-900 border border-zinc-700 flex">
                <span className="p-4 text-xs text-zinc-500">+91</span>
                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value.replace(/\D/g, '').slice(0, 10),
                    )
                  }
                  inputMode="numeric"
                  className="flex-1 bg-transparent p-4 text-white outline-none"
                  placeholder="98765 43210"
                />
              </div>
              {error && <p className="text-[10px] text-red-400 mt-3">{error}</p>}
              <button
                type="button"
                onClick={resolvePhone}
                className="w-full mt-5 rounded-2xl bg-rose-600 py-3 text-xs font-bold"
              >
                Verify and continue
              </button>
            </div>
          </div>
        )}

        {screen === 'upi' && (
          <div className="flex-1 p-5">
            <BackBar title="Pay by UPI ID" onBack={resetFlow} />
            <div className="mt-8">
              <input
                value={upiId}
                onChange={(event) => setUpiId(event.target.value)}
                placeholder="name@oksbi"
                className="w-full rounded-2xl bg-zinc-900 border border-zinc-700 p-4 text-sm text-white outline-none"
              />
              {error && <p className="text-[10px] text-red-400 mt-3">{error}</p>}
              <button
                type="button"
                onClick={resolveUpi}
                className="w-full mt-5 rounded-2xl bg-rose-600 py-3 text-xs font-bold"
              >
                Verify UPI ID
              </button>
            </div>
          </div>
        )}

        {screen === 'bank' && (
          <div className="flex-1 p-5">
            <BackBar title="Bank transfer" onBack={resetFlow} />
            <div className="mt-5 space-y-3">
              <input
                value={accountNumber}
                onChange={(event) =>
                  setAccountNumber(event.target.value.replace(/\D/g, ''))
                }
                placeholder="Account number"
                className="w-full rounded-2xl bg-zinc-900 border border-zinc-700 p-3 text-sm"
              />
              <input
                value={confirmAccountNumber}
                onChange={(event) =>
                  setConfirmAccountNumber(event.target.value.replace(/\D/g, ''))
                }
                placeholder="Confirm account number"
                className="w-full rounded-2xl bg-zinc-900 border border-zinc-700 p-3 text-sm"
              />
              <input
                value={ifsc}
                onChange={(event) => setIfsc(event.target.value.toUpperCase())}
                placeholder="IFSC"
                className="w-full rounded-2xl bg-zinc-900 border border-zinc-700 p-3 text-sm"
              />
              {error && <p className="text-[10px] text-red-400">{error}</p>}
              <button
                type="button"
                onClick={resolveBank}
                className="w-full rounded-2xl bg-rose-600 py-3 text-xs font-bold"
              >
                Verify beneficiary
              </button>
            </div>
          </div>
        )}

        {screen === 'qr' && (
          <div className="flex-1 p-5">
            <BackBar title="Scan UPI QR" onBack={resetFlow} />
            <div className="mt-5 relative aspect-square rounded-3xl bg-black border border-zinc-700 overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              {!cameraOn && <QrCode className="w-12 h-12 text-zinc-700" />}
              <div className="absolute inset-10 border-2 border-white/70 rounded-2xl" />
            </div>
            {qrError && <p className="text-[10px] text-amber-300 mt-3">{qrError}</p>}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                type="button"
                onClick={startCamera}
                className="rounded-2xl border border-zinc-700 bg-zinc-900 py-3 text-[10px] flex justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Use camera
              </button>
              <label className="rounded-2xl border border-zinc-700 bg-zinc-900 py-3 text-[10px] flex justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload gallery
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) =>
                    event.target.files?.[0] &&
                    scanUploadedQr(event.target.files[0])
                  }
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => setScreen('upi')}
              className="w-full mt-3 text-[9px] text-zinc-500"
            >
              Pay by UPI ID instead
            </button>
          </div>
        )}

        {screen === 'amount' && recipient && (
          <div className="flex-1 p-5">
            <BackBar title="Enter amount" onBack={resetFlow} />
            <div className="mt-7 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 mx-auto flex items-center justify-center font-bold">
                {recipient.initials}
              </div>
              <p className="text-sm font-bold text-white mt-3 capitalize">
                {recipient.name}
              </p>
              <p className="text-[9px] text-zinc-500">{recipient.id}</p>
            </div>
            <div className="mt-7 text-center">
              <span className="text-2xl text-zinc-500">₹</span>
              <input
                autoFocus
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value.replace(/[^\d.]/g, ''));
                  setError(null);
                }}
                inputMode="decimal"
                className="w-44 bg-transparent text-center text-4xl font-black text-white outline-none"
                placeholder="0"
              />
            </div>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a note (optional)"
              className="w-full mt-5 rounded-2xl bg-zinc-900 border border-zinc-700 p-3 text-xs"
            />
            {error && <p className="text-[10px] text-red-400 mt-3">{error}</p>}
            <button
              type="button"
              onClick={continueAmount}
              className="w-full mt-5 rounded-2xl bg-rose-600 py-3 text-xs font-bold"
            >
              Continue
            </button>
          </div>
        )}

        {screen === 'review' && recipient && (
          <div className="flex-1 p-5">
            <BackBar title="Review payment" onBack={() => setScreen('amount')} />
            <div className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 mx-auto flex items-center justify-center font-bold">
                {recipient.initials}
              </div>
              <p className="text-sm font-bold mt-3 capitalize">{recipient.name}</p>
              <p className="text-[9px] text-zinc-500">{recipient.id}</p>
              <p className="text-3xl font-black mt-5">
                {money(Number(amount || transaction.amount))}
              </p>
              {note && <p className="text-xs text-zinc-400 mt-2">{note}</p>}
            </div>
            <div className="mt-4 rounded-2xl border border-zinc-800 p-4 flex justify-between">
              <span>
                <small className="text-zinc-500">Paying from</small>
                <b className="block text-xs">{DEFAULT_ACCOUNT.bankName}</b>
                <small className="text-zinc-500">{DEFAULT_ACCOUNT.accountMask}</small>
              </span>
              <CreditCard className="w-5 h-5 text-zinc-500" />
            </div>
            <button
              type="button"
              onClick={() => openPin('payment')}
              className="w-full mt-5 rounded-2xl bg-rose-600 py-3 text-xs font-bold"
            >
              Pay {money(Number(amount || transaction.amount))}
            </button>
          </div>
        )}

        {screen === 'pin' && renderPin()}

        {screen === 'pipeline' && (
          <div className="flex-1 p-5 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-rose-400 animate-spin" />
            <p className="text-sm font-bold mt-4">Processing payment</p>
            <p className="text-[10px] text-zinc-500 mt-2">
              Pre-authorization checks are running securely.
            </p>
            <div className="mt-6 text-left space-y-2">
              {[
                'Payment intent received',
                'Context validated',
                'Risk signals evaluated',
                'Decision policy applied',
                'Ready',
              ].map((step, index) => (
                <p
                  key={step}
                  className={
                    'text-[10px] ' +
                    (pipelineStep >= index + 1
                      ? 'text-zinc-300'
                      : 'text-zinc-600')
                  }
                >
                  ● {step}
                </p>
              ))}
            </div>
            {evaluationError && (
              <p className="text-[9px] text-amber-400 mt-5 max-w-[260px]">
                Production backend unavailable. This run is clearly marked as local fallback in the technical panel.
              </p>
            )}
          </div>
        )}

        {screen === 'risk' && assessment && recipient && (
          <div className="flex-1 p-5 overflow-y-auto">
            <BackBar
              title={
                assessment.risk_level === 'MEDIUM'
                  ? 'Payment needs verification'
                  : 'Potentially risky payment'
              }
              onBack={cancelRiskPayment}
            />
            <div
              className={
                'mt-5 rounded-3xl border p-4 ' +
                (assessment.risk_level === 'MEDIUM'
                  ? 'border-amber-700 bg-amber-950/20'
                  : 'border-red-700 bg-red-950/20')
              }
            >
              <div className="flex gap-3">
                <ShieldAlert
                  className={
                    'w-5 h-5 ' +
                    (assessment.risk_level === 'MEDIUM'
                      ? 'text-amber-400'
                      : 'text-red-400')
                  }
                />
                <div>
                  <b className="text-sm">
                    {assessment.risk_level === 'MEDIUM'
                      ? 'We noticed something unusual'
                      : 'SentinelAI recommends stopping this payment'}
                  </b>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    {friendlyReason(
                      assessment.reason_codes[0] || 'HIGH_ANOMALY',
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-zinc-800 p-3 flex justify-between">
              <span>
                <b className="block text-xs">{recipient.name}</b>
                <small className="text-zinc-500">{recipient.id}</small>
              </span>
              <b>{money(Number(amount || transaction.amount))}</b>
            </div>

            <button
              type="button"
              onClick={() => setShowWhy(!showWhy)}
              className="w-full mt-3 rounded-xl border border-zinc-800 py-2 text-xs"
            >
              {showWhy ? 'Hide details' : 'View why this was flagged'}
            </button>

            {showWhy && (
              <div className="mt-2 space-y-2">
                {assessment.reason_codes.slice(0, 4).map((code) => (
                  <p
                    key={code}
                    className="rounded-xl border border-zinc-800 p-3 text-[10px] text-zinc-400"
                  >
                    {friendlyReason(code)}
                  </p>
                ))}
              </div>
            )}

            {assessment.risk_level === 'HIGH' && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setScreen('report')}
                  className="rounded-xl border border-red-800 py-2 text-[10px] text-red-300 flex justify-center gap-1"
                >
                  <Flag className="w-3 h-3" />
                  Report
                </button>
                <button
                  type="button"
                  onClick={blockReceiver}
                  className="rounded-xl border border-red-800 py-2 text-[10px] text-red-300 flex justify-center gap-1"
                >
                  <Ban className="w-3 h-3" />
                  Block
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={cancelRiskPayment}
              className="w-full mt-3 rounded-2xl border border-zinc-700 py-3 text-xs font-bold"
            >
              Cancel payment
            </button>

            {assessment.risk_level === 'MEDIUM' ? (
              <button
                type="button"
                onClick={() => openPin('stepup')}
                className="w-full mt-2 rounded-2xl bg-amber-500 text-zinc-950 py-3 text-xs font-black"
              >
                Verify and continue
              </button>
            ) : (
              <>
                <label className="mt-3 flex gap-2 text-[10px] text-zinc-400">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                  />
                  <span>
                    I recognise this receiver and understand SentinelAI recommends cancelling.
                  </span>
                </label>
                <button
                  type="button"
                  disabled={!acknowledged}
                  onClick={() => openPin('stepup')}
                  className="w-full mt-3 rounded-2xl bg-red-600 disabled:opacity-40 py-3 text-xs font-bold"
                >
                  Continue anyway with verification
                </button>
              </>
            )}
          </div>
        )}

        {screen === 'report' && assessment && recipient && (
          <div className="flex-1 p-5">
            <BackBar title="Report receiver" onBack={() => setScreen('risk')} />
            <p className="text-xs font-semibold mt-5">
              Why are you reporting {recipient.name}?
            </p>
            <div className="space-y-2 mt-3">
              {[
                'Suspected scam',
                'Impersonation',
                'Fraudulent payment request',
                'Other',
              ].map((reason) => (
                <label
                  key={reason}
                  className="rounded-2xl border border-zinc-800 p-3 flex gap-3 text-xs"
                >
                  <input
                    type="radio"
                    checked={reportReason === reason}
                    onChange={() => setReportReason(reason)}
                  />
                  {reason}
                </label>
              ))}
            </div>
            {reportMessage && (
              <p className="mt-3 text-[10px] text-zinc-300">{reportMessage}</p>
            )}
            <button
              type="button"
              disabled={reportBusy}
              onClick={submitReport}
              className="w-full mt-4 rounded-2xl bg-red-600 py-3 text-xs font-bold"
            >
              {reportBusy ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        )}

        {screen === 'result' && lastReceipt && renderReceipt(lastReceipt)}

        {screen === 'history' && (
          <div className="flex-1 p-5 overflow-y-auto">
            <BackBar title="Recent activity" onBack={resetFlow} />
            <p className="text-[10px] text-zinc-500 mt-4">
              Amounts stay hidden until you verify your UPI PIN.
            </p>
            <div className="space-y-2 mt-3">
              {history.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => {
                    setSelectedHistory(record);
                    openPin('history');
                  }}
                  className="w-full rounded-2xl border border-zinc-800 p-3 flex justify-between text-left"
                >
                  <span>
                    <b className="block text-xs">{record.recipientName}</b>
                    <small className="text-[9px] text-zinc-500">
                      {formatDateTime(record.timestamp)} • {record.status}
                    </small>
                  </span>
                  <span className="text-xs font-mono">₹ ••••</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === 'history_detail' &&
          selectedHistory &&
          renderReceipt(selectedHistory, true)}

        {screen === 'demo' && (
          <div className="flex-1 p-5 overflow-y-auto">
            <BackBar title="SentinelAI Demo Lab" onBack={resetFlow} />
            <p className="text-[10px] text-zinc-500 mt-4">
              Controlled fixtures use the same payment and PIN pipeline as the normal app.
            </p>
            <div className="space-y-3 mt-4">
              {DEMO_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => runDemo(scenario)}
                  className={
                    'w-full rounded-2xl border p-4 text-left ' +
                    (scenario.accent === 'green'
                      ? 'border-emerald-800 bg-emerald-950/20'
                      : scenario.accent === 'amber'
                        ? 'border-amber-800 bg-amber-950/20'
                        : 'border-red-800 bg-red-950/20')
                  }
                >
                  <div className="flex justify-between">
                    <span>
                      <b className="block text-xs">{scenario.title}</b>
                      <small className="text-[9px] text-zinc-400">
                        {scenario.subtitle}
                      </small>
                    </span>
                    <b className="text-xs font-mono">
                      {money(scenario.payee.defaultAmount)}
                    </b>
                  </div>
                  <small className="text-[9px] text-zinc-500">
                    {scenario.payee.name}
                  </small>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
