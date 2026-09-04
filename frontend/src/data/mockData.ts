import { Payee, SharedTransaction } from '../types/sentinel';

export const PRESET_PAYEES: Payee[] = [
  {
    id: 'bluetokai@icici',
    name: 'Blue Tokai Specialty Coffee',
    vpa: 'bluetokai@icici',
    category: 'Food & Beverage',
    initials: 'B',
    verified: true,
    defaultAmount: 450,
    defaultNote: 'Morning artisan espresso & sandwich',
    presetRisk: 'low',
    receiver_type: 'merchant'
  },
  {
    id: 'naturesbasket@hdfcbank',
    name: "Nature's Basket Gourmet",
    vpa: 'naturesbasket@hdfcbank',
    category: 'Groceries & Gourmet',
    initials: 'N',
    verified: true,
    defaultAmount: 2500,
    defaultNote: 'Weekly organic pantry & farm produce',
    presetRisk: 'low',
    receiver_type: 'merchant'
  },
  {
    id: 'croma.retail@axisbank',
    name: 'Croma Electronics',
    vpa: 'croma.retail@axisbank',
    category: 'Consumer Electronics',
    initials: 'C',
    verified: true,
    defaultAmount: 18500,
    defaultNote: 'Smart home hub & wireless noise-cancelling audio',
    presetRisk: 'medium',
    receiver_type: 'new_merchant'
  },
  {
    id: 'shadow.crypto.p2p@airtel',
    name: 'P2P Instant Crypto Cashout',
    vpa: 'shadow.crypto.p2p@airtel',
    category: 'High-Risk Escrow / P2P Exchange',
    initials: 'P',
    verified: false,
    defaultAmount: 94500,
    defaultNote: 'Urgent P2P escrow release #482',
    presetRisk: 'high',
    receiver_type: 'unverified_p2p'
  }
];

export const PRESET_AMOUNTS = [450, 2500, 18500, 94500];

export const INITIAL_TRANSACTION: SharedTransaction = {
  transaction_id: 'TXN-UPI-' + Math.floor(100000 + Math.random() * 900000) + '-7721',
  user_id: 'USR_IND_8829104',
  amount: 450,
  currency: 'INR',
  receiver_id: 'bluetokai@icici',
  receiver_name: 'Blue Tokai Specialty Coffee',
  receiver_type: 'merchant',
  timestamp: new Date().toISOString(),
  device_id: 'DEV_APPL_IPHONE_15_PRO_ENCLAVE',
  device_type: 'primary_ios',
  device_name: 'Apple iPhone 15 Pro (A3102)',
  location: {
    latitude: 12.9716,
    longitude: 77.5946,
    city: 'Bengaluru',
    country: 'IND'
  },
  ip_address: '49.207.214.88',
  user_context: {
    account_age_days: 580,
    previous_transaction_count: 312,
    usual_transaction_range: {
      min: 150.0,
      max: 5000.0
    }
  },
  note: 'Morning artisan espresso & sandwich'
};
