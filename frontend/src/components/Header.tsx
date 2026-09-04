import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header 
      className="w-full backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 transition-all border-b shadow-sm"
      style={{
        backgroundColor: 'var(--bg-header)',
        borderColor: 'var(--border-default)'
      }}
    >
      <div className="max-w-[1780px] mx-auto flex items-center justify-between gap-3">
        
        {/* Left: Branding & Subtitle (Preserved Far-Left Anchor) */}
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
            </div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Real-time Pre-Authorization Fraud &amp; Behavioral ML Interception Engine
            </p>
          </div>
        </div>

        {/* Right side kept clean and empty as requested */}
        <div></div>

      </div>
    </header>
  );
};
