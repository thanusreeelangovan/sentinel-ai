import React, { useState } from 'react';
import { Sliders, Play } from 'lucide-react';
import { RiskAssessment, SharedTransaction, RiskBreakdown } from '../types/sentinel';
import { calculateRiskAssessment } from '../services/riskEngine';

interface CustomSandboxProps {
  transaction: SharedTransaction;
  onApplySandboxAssessment: (assessment: RiskAssessment, updatedTx: SharedTransaction) => void;
}

export const CustomSandbox: React.FC<CustomSandboxProps> = ({
  transaction,
  onApplySandboxAssessment,
}) => {
  const [anomaly, setAnomaly] = useState<number>(10);
  const [velocity, setVelocity] = useState<number>(15);
  const [receiver, setReceiver] = useState<number>(10);
  const [behavioral, setBehavioral] = useState<number>(8);
  const [amount, setAmount] = useState<number>(transaction.amount);

  const composite = Math.round(
    ((anomaly * 0.40) + (velocity * 0.25) + (receiver * 0.20) + (behavioral * 0.15)) * 10
  ) / 10;

  const decision = composite <= 40 ? 'APPROVE' : composite <= 75 ? 'VERIFY' : 'BLOCK';
  const riskLevel = composite <= 40 ? 'LOW' : composite <= 75 ? 'MEDIUM' : 'HIGH';

  const handleApply = () => {
    const updatedTx: SharedTransaction = {
      ...transaction,
      amount,
    };
    const breakdown: RiskBreakdown = {
      anomaly,
      velocity,
      receiver,
      behavioral
    };
    const assessment = calculateRiskAssessment(updatedTx, breakdown);
    onApplySandboxAssessment(assessment, updatedTx);
  };

  const handlePreset = (preset: 'low' | 'medium' | 'high' | 'cross_account') => {
    if (preset === 'low') {
      setAnomaly(12);
      setVelocity(15);
      setReceiver(8);
      setBehavioral(10);
      setAmount(450);
    } else if (preset === 'medium') {
      setAnomaly(55);
      setVelocity(50);
      setReceiver(45);
      setBehavioral(40);
      setAmount(18500);
    } else if (preset === 'high') {
      setAnomaly(92);
      setVelocity(88);
      setReceiver(95);
      setBehavioral(90);
      setAmount(94500);
    } else if (preset === 'cross_account') {
      setAnomaly(45);
      setVelocity(95);
      setReceiver(90);
      setBehavioral(30);
      setAmount(20);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      
      {/* Sandbox Header */}
      <div className="p-6 rounded-3xl bg-white border border-[#CCFBF1] shadow-[0_16px_40px_-10px_rgba(15,118,110,0.12)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#064E3B] flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#0F766E]" />
              SentinelAI Neural Risk Sandbox &amp; Threshold Calibrator
            </h2>
            <p className="text-xs text-[#374151] mt-1">
              Directly manipulate the 4 normalized feature signals (0-100) to test real-time threshold transitions and visual boundary states.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handlePreset('low')}
              className="px-3 py-1.5 rounded-xl bg-[#F0FDF4] hover:bg-[#E6FAF5] text-[#0F766E] border border-[#CCFBF1] text-xs font-mono font-bold transition shadow-sm"
            >
              Test Low Risk (≤40)
            </button>
            <button
              onClick={() => handlePreset('medium')}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-mono font-bold transition shadow-sm"
            >
              Test Med Risk (41-75)
            </button>
            <button
              onClick={() => handlePreset('high')}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 text-xs font-mono font-bold transition shadow-sm"
            >
              Test High Risk (&gt;75)
            </button>
            <button
              onClick={() => handlePreset('cross_account')}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F0FDF4] text-[#064E3B] border border-[#0F766E]/50 text-xs font-mono font-bold transition shadow-sm"
            >
              Cross-Account Burst
            </button>
          </div>
        </div>
      </div>

      {/* Sliders & Output */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-[#CCFBF1] space-y-6 shadow-sm">
          <h3 className="text-sm font-bold text-[#064E3B] uppercase tracking-wider font-mono">
            INPUT RISK SIGNALS &amp; WEIGHTED NORMALIZATION
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#064E3B] font-bold flex items-center gap-1.5">
                <span>1. Isolation Forest Anomaly Score</span>
                <span className="text-[#64748B] font-normal">(ML Model)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[#374151]">Weight: 40%</span>
                <span className="text-[#0F766E] font-bold text-sm w-12 text-right">{anomaly} / 100</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={anomaly}
              onChange={(e) => setAnomaly(parseInt(e.target.value, 10))}
              className="w-full accent-[#0F766E] h-2 bg-[#F0FDF4] rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#064E3B] font-bold flex items-center gap-1.5">
                <span>2. Transaction Velocity Score</span>
                <span className="text-[#64748B] font-normal">(Burst &amp; Frequency)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[#374151]">Weight: 25%</span>
                <span className="text-[#0F766E] font-bold text-sm w-12 text-right">{velocity} / 100</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={velocity}
              onChange={(e) => setVelocity(parseInt(e.target.value, 10))}
              className="w-full accent-[#0F766E] h-2 bg-[#F0FDF4] rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#064E3B] font-bold flex items-center gap-1.5">
                <span>3. Receiver Risk Score</span>
                <span className="text-[#64748B] font-normal">(Mule / Unverified VPA)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[#374151]">Weight: 20%</span>
                <span className="text-amber-600 font-bold text-sm w-12 text-right">{receiver} / 100</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={receiver}
              onChange={(e) => setReceiver(parseInt(e.target.value, 10))}
              className="w-full accent-amber-600 h-2 bg-[#F0FDF4] rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#064E3B] font-bold flex items-center gap-1.5">
                <span>4. Behavioral Deviation Score</span>
                <span className="text-[#64748B] font-normal">(Keystroke &amp; Gyro)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[#374151]">Weight: 15%</span>
                <span className="text-[#0F766E] font-bold text-sm w-12 text-right">{behavioral} / 100</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={behavioral}
              onChange={(e) => setBehavioral(parseInt(e.target.value, 10))}
              className="w-full accent-[#0F766E] h-2 bg-[#F0FDF4] rounded-lg cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-[#CCFBF1]">
            <label className="text-xs font-mono text-[#064E3B] font-bold block mb-1.5">TRANSACTION AMOUNT (₹ INR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
              className="w-full px-4 py-2.5 bg-[#F0FDF4] border border-[#CCFBF1] rounded-xl text-[#064E3B] font-mono text-sm font-bold focus:outline-none focus:border-[#0F766E]"
            />
          </div>
        </div>

        {/* Outcome */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between transition-all ${
          composite > 75 
            ? 'bg-red-50 border-red-300 shadow-sm' :
          composite > 40
            ? 'bg-amber-50 border-amber-300 shadow-sm' :
            'bg-[#F0FDF4] border-[#0F766E] shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-[#374151] uppercase font-bold">CALCULATED OUTCOME</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                decision === 'APPROVE' ? 'bg-[#0F766E] text-white' :
                decision === 'VERIFY' ? 'bg-amber-500 text-white' :
                'bg-red-600 text-white'
              }`}>
                {riskLevel} RISK
              </span>
            </div>

            <div className="text-center py-6">
              <span className="text-xs font-mono text-[#374151] block uppercase">COMPOSITE RISK SCORE</span>
              <div className={`text-5xl font-black font-mono my-2 ${
                composite > 75 ? 'text-red-600' : composite > 40 ? 'text-amber-600' : 'text-[#0F766E]'
              }`}>
                {composite}
                <span className="text-lg text-[#64748B] font-normal">/100</span>
              </div>
              
              <div className="inline-block mt-2 px-4 py-1.5 rounded-xl font-mono text-sm font-black uppercase tracking-wider bg-white border border-[#CCFBF1] text-[#064E3B] shadow-sm">
                DECISION: {decision}
              </div>
            </div>

            <div className="space-y-2 p-3.5 rounded-2xl bg-white border border-[#CCFBF1] text-xs font-mono">
              <div className={`flex items-center justify-between ${composite <= 40 ? 'text-[#0F766E] font-bold' : 'text-[#64748B]'}`}>
                <span>≤ 40: LOW RISK</span>
                <span>APPROVE</span>
              </div>
              <div className={`flex items-center justify-between ${composite > 40 && composite <= 75 ? 'text-amber-600 font-bold' : 'text-[#64748B]'}`}>
                <span>41 - 75: MEDIUM RISK</span>
                <span>VERIFY</span>
              </div>
              <div className={`flex items-center justify-between ${composite > 75 ? 'text-red-600 font-bold' : 'text-[#64748B]'}`}>
                <span>&gt; 75: HIGH RISK</span>
                <span>BLOCK / DUAL-PIN OVERRIDE</span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleApply}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0F766E] hover:bg-[#0D645D] text-white font-black text-sm flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(15,118,110,0.3)] transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Send To Simulator</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
