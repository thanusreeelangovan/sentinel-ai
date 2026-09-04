# SentinelAI - Real-time Pre-Authorization Fraud Detection System

SentinelAI is a sub-millisecond pre-authorization fraud detection engine designed to intercept high-risk financial and UPI payment transactions before fund dispatch.

## Core Visual Risk State Thresholds
- **$\le 40$ (LOW RISK $\rightarrow$ APPROVE)**: Instant frictionless authorization, zero blocking popups, green emerald status.
- **$41 - 75$ (MEDIUM RISK $\rightarrow$ VERIFY)**: Yellow/Amber/Gold border glow, non-blocking step-up verification toast notification.
- **$> 75$ (HIGH RISK $\rightarrow$ BLOCK)**: Dark Red / Crimson scheme, prominent urgent critical alert modal, transaction intercepted and blocked.

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Risk Engine Contract**: 40% Isolation Forest Anomaly + 25% Velocity + 20% Receiver + 15% Behavioral Signals
- **Performance**: Strict 60fps animations with GPU hardware acceleration and sub-50ms latency profiles.

## Running Locally
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:3000`.
