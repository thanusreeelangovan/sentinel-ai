import React from 'react';
import { ShieldCheck, Activity, Zap, Cpu, Layers, Palette, Sparkles } from 'lucide-react';

export type ThemeName = 'warm-copper' | 'teal';

interface HeaderProps {
  activeTab: 'simulator' | 'sandbox' | 'architecture';
  setActiveTab: (tab: 'simulator' | 'sandbox' | 'architecture') => void;
  evaluatedCount: number;
  currentTheme: ThemeName;
  onSelectTheme: (theme: ThemeName) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  evaluatedCount,
  currentTheme,
  onSelectTheme,
}) => {
  return (
    <header className="w-full backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 transition-all border-b shadow-sm"
      style={{
        backgroundColor: 'var(--bg-header)',
        borderColor: 'var(--border-default)'
      }}
    >
      <div className="max-w-[1780px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div 
            className="relative flex items-center justify-center w-10 h-10 rounded-2xl border shadow-sm transition-transform duration-200 hover:scale-105"
            style={{
              backgroundColor: 'var(--bg-card-subtle)',
              borderColor: 'var(--border-focused)'
            }}
          >
            <ShieldCheck className="w-6 h-6" style={{ color: 'var(--primary)' }} />
            <span 
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-ping opacity-75"
              style={{ backgroundColor: 'var(--primary)' }}
            ></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                Sentinel<span style={{ color: 'var(--primary)' }}>AI</span>
              </h1>
              <span 
                className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full border shadow-sm flex items-center gap-1"
                style={{
                  backgroundColor: 'var(--bg-card-subtle)',
                  color: 'var(--primary)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <Sparkles className="w-2.5 h-2.5" style={{ color: 'var(--primary)' }} />
                {currentTheme === 'warm-copper' ? 'WARM COPPER & SAND' : 'TEAL & FINANCIAL MINT'}
              </span>
            </div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Real-time Pre-Authorization Fraud &amp; Behavioral ML Interception Engine
            </p>
          </div>
        </div>

        {/* Center / Right: Metrics & Mode Tabs */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
          
          {/* SLA & Evaluation Metrics */}
          <div 
            className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl border text-xs font-mono shadow-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-default)'
            }}
          >
            <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>P99 SLA:</span>
              <span className="font-bold" style={{ color: 'var(--primary)' }}>38ms</span>
            </div>
            <div className="w-px h-3.5" style={{ backgroundColor: 'var(--border-default)' }}></div>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Activity className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
              <span>Evaluated:</span>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{evaluatedCount}</span>
            </div>
          </div>

          {/* Quick Theme Switcher */}
          <div 
            className="flex items-center gap-1.5 p-1 rounded-xl border shadow-sm"
            style={{
              backgroundColor: 'var(--bg-card-subtle)',
              borderColor: 'var(--border-default)'
            }}
          >
            <div className="flex items-center gap-1 pl-2 pr-1 text-[11px] font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
              <Palette className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
              <span className="hidden sm:inline">Theme:</span>
            </div>

            <button
              onClick={() => onSelectTheme('warm-copper')}
              title="2. Nordic Copper & Warm Sand UI"
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                currentTheme === 'warm-copper'
                  ? 'bg-[#C2410C] text-white shadow-sm ring-2 ring-[#C2410C]/30'
                  : 'text-[#57534E] hover:bg-stone-200/60'
              }`}
            >
              <span>☕ Warm Copper UI</span>
            </button>

            <button
              onClick={() => onSelectTheme('teal')}
              title="1. Subtle Blue-Green / Institutional Teal UI"
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                currentTheme === 'teal'
                  ? 'bg-[#0F766E] text-white shadow-sm ring-2 ring-[#0F766E]/30'
                  : 'text-[#064E3B] hover:bg-emerald-100/60'
              }`}
            >
              <span>🌿 Teal UI</span>
            </button>
          </div>

          {/* Navigation Mode Tabs */}
          <nav 
            className="flex items-center p-1 rounded-xl border shadow-sm"
            style={{
              backgroundColor: 'var(--bg-card-subtle)',
              borderColor: 'var(--border-default)'
            }}
          >
            <button
              onClick={() => setActiveTab('simulator')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
              style={{
                backgroundColor: activeTab === 'simulator' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'simulator' ? 'var(--text-on-primary)' : 'var(--text-secondary)'
              }}
            >
              <Cpu className="w-3.5 h-3.5" />
              Demo Simulator
            </button>

            <button
              onClick={() => setActiveTab('sandbox')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition"
              style={{
                backgroundColor: activeTab === 'sandbox' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'sandbox' ? 'var(--text-on-primary)' : 'var(--text-secondary)'
              }}
            >
              <Activity className="w-3.5 h-3.5" />
              Custom Sandbox
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition"
              style={{
                backgroundColor: activeTab === 'architecture' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'architecture' ? 'var(--text-on-primary)' : 'var(--text-secondary)'
              }}
            >
              <Layers className="w-3.5 h-3.5" />
              Architecture &amp; API
            </button>
          </nav>

        </div>
      </div>
    </header>
  );
};
