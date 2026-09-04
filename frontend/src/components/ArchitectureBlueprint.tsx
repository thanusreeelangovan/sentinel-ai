import React from 'react';
import { Database, Server, Layers, Users, Sparkles } from 'lucide-react';

export const ArchitectureBlueprint: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-[#CCFBF1] shadow-[0_16px_40px_-10px_rgba(15,118,110,0.12)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#0F766E]/40 flex items-center justify-center text-[#0F766E]">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#064E3B] flex items-center gap-2">
              <span>SentinelAI Technical Contract &amp; Architecture Blueprint</span>
              <Sparkles className="w-4 h-4 text-[#0F766E]" />
            </h2>
            <p className="text-xs text-[#374151]">
              Team BYTE STORM • Smart Horizon 2026 International 48 Hour Hackathon
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Component Ownership & End-to-End Flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Team Technical Boundaries */}
        <div className="p-6 rounded-3xl bg-white border border-[#CCFBF1] space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#064E3B] uppercase tracking-wider font-mono flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0F766E]" />
            Team Technical Ownership &amp; Boundaries
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#CCFBF1]">
              <div className="flex items-center justify-between font-bold text-[#064E3B] mb-1">
                <span>Devika</span>
                <span className="font-mono text-[11px] text-[#0F766E]">Data Science &amp; ML</span>
              </div>
              <p className="text-[#374151]">
                Isolation Forest, feature engineering, normalized anomaly score (0 - 100).
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#CCFBF1]">
              <div className="flex items-center justify-between font-bold text-[#064E3B] mb-1">
                <span>Krrish</span>
                <span className="font-mono text-[11px] text-[#0D9488]">Decision &amp; Rule Layer</span>
              </div>
              <p className="text-[#374151]">
                Velocity score, receiver risk, behavioral deviation signals, reason codes.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#CCFBF1]">
              <div className="flex items-center justify-between font-bold text-[#064E3B] mb-1">
                <span>Thanusree</span>
                <span className="font-mono text-[11px] text-[#0F766E]">Backend &amp; Orchestration</span>
              </div>
              <p className="text-[#374151]">
                FastAPI, PostgreSQL schemas, Docker, API contracts, integration boundary.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#CCFBF1]">
              <div className="flex items-center justify-between font-bold text-[#064E3B] mb-1">
                <span>Alisha &amp; Chandana</span>
                <span className="font-mono text-[11px] text-[#14B8A6]">Frontend &amp; Visualization</span>
              </div>
              <p className="text-[#374151]">
                UPI mobile simulator, dashboard telemetry deck, SHAP attribution, real-time risk alert popups.
              </p>
            </div>
          </div>
        </div>

        {/* Pipeline Flow */}
        <div className="p-6 rounded-3xl bg-white border border-[#CCFBF1] space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#064E3B] uppercase tracking-wider font-mono flex items-center gap-2">
            <Server className="w-4 h-4 text-[#0F766E]" />
            End-to-End Interception Pipeline
          </h3>

          <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#CCFBF1] font-mono text-xs text-[#064E3B] space-y-2">
            <div className="flex items-center justify-between text-[#064E3B] font-bold pb-2 border-b border-[#CCFBF1]">
              <span>Transaction Initiated</span>
              <span className="text-[#0F766E]">Shared Transaction JSON</span>
            </div>
            
            <div className="space-y-1.5 text-[11px] pl-2 border-l-2 border-[#0F766E]">
              <div className="flex items-center justify-between">
                <span>1. FastAPI Gateway</span>
                <span className="text-[#374151]">POST /transactions/evaluate</span>
              </div>
              <div className="flex items-center justify-between">
                <span>2. Feature Extraction</span>
                <span className="text-[#0F766E] font-bold">Isolation Forest (Devika)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>3. Rule Engine Signals</span>
                <span className="text-[#0D9488] font-bold">Velocity + Receiver + Behavior (Krrish)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>4. Risk Engine Fusion</span>
                <span className="text-amber-700 font-bold">40% A + 25% V + 20% R + 15% B</span>
              </div>
              <div className="flex items-center justify-between">
                <span>5. Decision Matrix</span>
                <span className="text-[#0F766E] font-bold">APPROVE / VERIFY / BLOCK</span>
              </div>
              <div className="flex items-center justify-between">
                <span>6. Audit Record</span>
                <span className="text-[#374151]">PostgreSQL Immutable Log</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#0F766E]/40 text-xs font-mono text-[#0F766E] font-bold">
            Critical Integration Rule: All upstream risk signals must be normalized to (0 - 100) before reaching the Risk Engine.
          </div>
        </div>

      </div>

      {/* Database Schema Overview */}
      <div className="p-6 rounded-3xl bg-white border border-[#CCFBF1] space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-[#064E3B] uppercase tracking-wider font-mono flex items-center gap-2">
          <Database className="w-4 h-4 text-[#0F766E]" />
          PostgreSQL Database Schemas (Section 10)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#CCFBF1]">
            <span className="font-bold text-[#064E3B] block mb-2 text-[11px] pb-1 border-b border-[#CCFBF1]">
              1. users
            </span>
            <ul className="text-[10px] text-[#374151] space-y-1">
              <li>id: UUID PK</li>
              <li>user_id: VARCHAR UNQ</li>
              <li>account_age_days: INT</li>
              <li>created_at: TIMESTAMP</li>
            </ul>
          </div>

          <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#CCFBF1]">
            <span className="font-bold text-[#064E3B] block mb-2 text-[11px] pb-1 border-b border-[#CCFBF1]">
              2. transactions
            </span>
            <ul className="text-[10px] text-[#374151] space-y-1">
              <li>id: UUID PK</li>
              <li>transaction_id: VARCHAR</li>
              <li>user_id: VARCHAR FK</li>
              <li>amount: DECIMAL</li>
              <li>receiver_id: VARCHAR</li>
            </ul>
          </div>

          <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#CCFBF1]">
            <span className="font-bold text-[#064E3B] block mb-2 text-[11px] pb-1 border-b border-[#CCFBF1]">
              3. risk_assessments
            </span>
            <ul className="text-[10px] text-[#374151] space-y-1">
              <li>id: UUID PK</li>
              <li>transaction_id: FK</li>
              <li>anomaly_score: DEC</li>
              <li>composite_score: DEC</li>
              <li>decision: VARCHAR</li>
            </ul>
          </div>

          <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#CCFBF1]">
            <span className="font-bold text-[#064E3B] block mb-2 text-[11px] pb-1 border-b border-[#CCFBF1]">
              4. rule_events
            </span>
            <ul className="text-[10px] text-[#374151] space-y-1">
              <li>id: UUID PK</li>
              <li>transaction_id: FK</li>
              <li>rule_code: VARCHAR</li>
              <li>score: DECIMAL</li>
              <li>reason: TEXT</li>
            </ul>
          </div>

          <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#CCFBF1]">
            <span className="font-bold text-[#064E3B] block mb-2 text-[11px] pb-1 border-b border-[#CCFBF1]">
              5. audit_logs
            </span>
            <ul className="text-[10px] text-[#374151] space-y-1">
              <li>id: UUID PK</li>
              <li>transaction_id: FK</li>
              <li>event_type: VARCHAR</li>
              <li>details: JSONB</li>
              <li>created_at: TIMESTAMP</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
};
