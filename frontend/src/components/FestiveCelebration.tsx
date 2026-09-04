import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Volume2, VolumeX, CheckCircle, Award } from 'lucide-react';

interface FestiveCelebrationProps {
  amount: number;
  receiverName: string;
  transactionId: string;
  onDismiss: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const FestiveCelebration: React.FC<FestiveCelebrationProps> = ({
  amount,
  receiverName,
  transactionId,
  onDismiss,
  isMuted,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (isMuted) return;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const playTone = (freq: number, startTime: number, duration: number, type: OscillatorType = 'sine') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      playTone(523.25, 0.0, 0.4);
      playTone(659.25, 0.1, 0.45);
      playTone(783.99, 0.22, 0.5);
      playTone(1046.50, 0.35, 0.75, 'triangle');
    } catch {
      // Audio fallback
    }
  }, [isMuted]);

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const colors = ['#0F766E', '#0D9488', '#2DD4BF', '#14B8A6', '#15803D', '#CCFBF1', '#F0FDF4'];
    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * width,
      y: Math.random() * (height * 0.4) - height * 0.1,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: (Math.random() - 0.5) * 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
      opacity: 1,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        if (p.y > height) {
          p.y = -20;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.9;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [reducedMotion]);

  return (
    <div 
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4"
      role="region"
      aria-label="Transaction Success Celebration"
    >
      {!reducedMotion && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />
      )}

      <div 
        className="pointer-events-auto relative max-w-lg w-full rounded-3xl bg-white border-2 border-[#0F766E] shadow-[0_24px_60px_-12px_rgba(15,118,110,0.35)] p-6 sm:p-7 text-[#064E3B] animate-scale-up z-20"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#CCFBF1]">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#0F766E]">
            <Sparkles className="w-4 h-4 text-[#0F766E] animate-spin" />
            <span className="font-bold tracking-wider uppercase">VERIFIED &amp; SAFE SETTLEMENT</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="p-1.5 rounded-lg bg-[#F0FDF4] hover:bg-[#E6FAF5] text-[#064E3B] transition border border-[#CCFBF1]"
              title={isMuted ? 'Unmute celebration sound' : 'Mute celebration sound'}
              aria-label={isMuted ? 'Unmute celebration sound' : 'Mute celebration sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#0F766E]" />}
            </button>

            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg bg-[#F0FDF4] hover:bg-[#E6FAF5] text-[#064E3B] transition border border-[#CCFBF1]"
              aria-label="Dismiss celebration"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-center py-2">
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#F0FDF4] border-2 border-[#0F766E] text-[#0F766E] mb-3 shadow-md">
            <Award className="w-10 h-10 animate-bounce text-[#0F766E]" />
            <span className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-[#0F766E] text-white text-[10px] font-mono font-black uppercase tracking-wider">
              100% SECURE
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-[#064E3B] mt-1">
            Payment Completed! 🎉
          </h3>
          
          <div className="text-3xl sm:text-4xl font-black font-mono text-[#0F766E] my-2">
            ₹{amount.toLocaleString('en-IN')}
          </div>

          <p className="text-xs sm:text-sm text-[#374151] max-w-sm mx-auto">
            Successfully routed to <span className="font-bold text-[#064E3B]">{receiverName}</span>. Pre-authorization behavioral ML cleared with zero friction.
          </p>

          <div className="mt-4 pt-3 border-t border-[#CCFBF1] flex items-center justify-between text-[11px] font-mono text-[#374151]">
            <span>TXN: <span className="text-[#0F766E] font-bold">{transactionId}</span></span>
            <span className="flex items-center gap-1 text-[#0F766E] font-bold">
              <CheckCircle className="w-3.5 h-3.5 text-[#0F766E]" />
              Instant Settlement
            </span>
          </div>

          <div className="mt-5">
            <button
              onClick={onDismiss}
              className="w-full py-3 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0D645D] text-white font-black text-sm shadow-md transition"
            >
              Continue / Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
