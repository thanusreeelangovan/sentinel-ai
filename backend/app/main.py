"""FastAPI Server for SentinelAI with Interactive Visual Risk Dashboard.

Integrates ML Anomaly Detection, Rule Engine, and Risk Engine.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from backend.app.schemas.transaction import AnomalyModelOutput, TransactionSchema
from ml.models.trainer import IsolationForestTrainer
from backend.app.rules.engine import RuleEngine
from backend.app.risk.engine import Decision, RiskEngine

# Global instances for lifespan loading
detector_instance: Optional[Any] = None
rule_engine = RuleEngine()
risk_engine = RiskEngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global detector_instance
    model_path = Path(__file__).resolve().parents[2] / "ml" / "models" / "iforest_v1.joblib"
    if not model_path.exists():
        # Fallback search
        model_path = Path("ml/models/iforest_v1.joblib")
    
    if model_path.exists():
        detector_instance = IsolationForestTrainer.load(model_path)
        print(f"Loaded trained Isolation Forest checkpoint from {model_path}")
    else:
        print(f"Warning: Checkpoint not found at {model_path}. ML score fallback enabled.")
    yield


app = FastAPI(
    title="SentinelAI Fraud & Risk Decision Service",
    version="1.0.0",
    description="Real-time hybrid ML & Rule-based transaction risk engine.",
    lifespan=lifespan,
)


@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, str]:
    return {"status": "healthy", "model_loaded": str(detector_instance is not None)}


@app.post("/transactions/evaluate", tags=["Risk Engine"])
async def evaluate_transaction(txn: TransactionSchema) -> Dict[str, Any]:
    try:
        if detector_instance is not None:
            ml_out = detector_instance.evaluate_transaction(txn)
            anomaly_score = ml_out.anomaly_score
        else:
            anomaly_score = 25.0

        rule_out = rule_engine.evaluate(txn)

        result = risk_engine.evaluate(
            transaction_id=txn.transaction_id,
            anomaly_score=anomaly_score,
            velocity_score=rule_out["velocity_score"],
            receiver_score=rule_out["receiver_score"],
            behavioral_score=rule_out["behavioral_score"],
            rules_triggered=rule_out["rules_triggered"],
            reason_codes=rule_out["reason_codes"],
            model_version="iforest_v1",
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk evaluation error: {str(e)}")


@app.get("/", response_class=HTMLResponse, tags=["Visual UI"])
async def visual_dashboard() -> str:
    """Renders a visual UI to test the Risk Engine live in the browser."""
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SentinelAI - Live Visual Risk Engine</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --accent-blue: #38bdf8;
            --approve-green: #22c55e;
            --verify-yellow: #eab308;
            --block-red: #ef4444;
            --text-primary: #f8fafc;
            --text-muted: #94a3b8;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', sans-serif; }
        body { background-color: var(--bg-color); color: var(--text-primary); padding: 2rem; min-height: 100vh; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid #334155; padding-bottom: 1rem; }
        h1 { font-weight: 700; color: var(--accent-blue); letter-spacing: -0.5px; }
        .badge { background: #0284c7; padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
        
        .container { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .card { background: var(--card-bg); padding: 1.8rem; border-radius: 16px; border: 1px solid #334155; }
        .card h2 { font-size: 1.25rem; margin-bottom: 1.2rem; color: var(--accent-blue); }
        
        .form-group { margin-bottom: 1rem; }
        label { display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.4rem; }
        input, select { width: 100%; padding: 0.75rem; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 0.95rem; }
        
        button { width: 100%; padding: 0.9rem; background: linear-gradient(135deg, #0284c7, #2563eb); border: none; border-radius: 8px; color: #fff; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s; margin-top: 1rem; }
        button:hover { opacity: 0.9; transform: translateY(-1px); }
        
        .decision-banner { padding: 1.5rem; border-radius: 12px; text-align: center; font-size: 1.8rem; font-weight: 700; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 2px; }
        .decision-APPROVE { background: rgba(34, 197, 94, 0.2); color: var(--approve-green); border: 2px solid var(--approve-green); }
        .decision-VERIFY { background: rgba(234, 179, 8, 0.2); color: var(--verify-yellow); border: 2px solid var(--verify-yellow); }
        .decision-BLOCK { background: rgba(239, 68, 68, 0.2); color: var(--block-red); border: 2px solid var(--block-red); }
        
        .metric-row { display: flex; justify-content: space-between; margin-bottom: 0.6rem; font-size: 0.95rem; }
        .progress-bg { background: #0f172a; height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 1.2rem; }
        .progress-fill { height: 100%; width: 0%; transition: width 0.5s ease; }
        
        .reasons { margin-top: 1.5rem; background: #0f172a; padding: 1rem; border-radius: 8px; }
        .reasons h4 { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem; }
        .reasons ul { list-style: none; }
        .reasons li { font-size: 0.85rem; color: #f8fafc; margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.5rem; }
        .reasons li::before { content: "•"; color: var(--accent-blue); font-size: 1.2rem; }
    </style>
</head>
<body>
    <header>
        <h1>Sentinel AI - Risk Decision Center</h1>
        <span class="badge">Hybrid ML + Rule Engine</span>
    </header>

    <div class="container">
        <!-- Input Form -->
        <div class="card">
            <h2>Simulate Transaction Input</h2>
            <div class="form-group">
                <label>Transaction ID</label>
                <input type="text" id="txn_id" value="TXN_882910">
            </div>
            <div class="form-group">
                <label>User ID</label>
                <input type="text" id="user_id" value="USR_402">
            </div>
            <div class="form-group">
                <label>Amount (INR ₹)</label>
                <input type="number" id="amount" value="85000">
            </div>
            <div class="form-group">
                <label>Receiver Type</label>
                <select id="receiver_type">
                    <option value="merchant">Merchant</option>
                    <option value="user" selected>Peer User (P2P)</option>
                    <option value="bank_account">Bank Account</option>
                </select>
            </div>
            <div class="form-group">
                <label>Historical Usual Max Amount (INR ₹)</label>
                <input type="number" id="usual_max" value="3000">
            </div>
            <button onclick="evaluateRisk()">Run Real-time Risk Analysis</button>
        </div>

        <!-- Visual Risk Output -->
        <div class="card">
            <h2>Live Risk & Decision Output</h2>
            <div id="decision_banner" class="decision-banner decision-APPROVE">APPROVE</div>
            
            <div class="metric-row">
                <span>Composite Risk Score</span>
                <strong id="composite_val">14.5</strong>
            </div>
            <div class="progress-bg"><div id="composite_bar" class="progress-fill" style="width: 14.5%; background: var(--approve-green);"></div></div>

            <div class="metric-row">
                <span>ML Isolation Forest Anomaly Score (40%)</span>
                <strong id="ml_val">20.0</strong>
            </div>
            <div class="progress-bg"><div id="ml_bar" class="progress-fill" style="width: 20%; background: var(--accent-blue);"></div></div>

            <div class="metric-row">
                <span>Velocity Score (25%)</span>
                <strong id="velocity_val">0.0</strong>
            </div>
            <div class="progress-bg"><div id="velocity_bar" class="progress-fill" style="width: 0%; background: var(--accent-blue);"></div></div>

            <div class="metric-row">
                <span>Receiver Novelty Score (20%)</span>
                <strong id="receiver_val">80.0</strong>
            </div>
            <div class="progress-bg"><div id="receiver_bar" class="progress-fill" style="width: 80%; background: var(--accent-blue);"></div></div>

            <div class="metric-row">
                <span>Behavioral Deviation Score (15%)</span>
                <strong id="behavior_val">100.0</strong>
            </div>
            <div class="progress-bg"><div id="behavior_bar" class="progress-fill" style="width: 100%; background: var(--accent-blue);"></div></div>

            <div class="reasons">
                <h4>Triggered Reason Codes</h4>
                <ul id="reason_list">
                    <li>System initialized ready for telemetry input</li>
                </ul>
            </div>
        </div>
    </div>

    <script>
        async function evaluateRisk() {
            const payload = {
                transaction_id: document.getElementById('txn_id').value,
                user_id: document.getElementById('user_id').value,
                amount: parseFloat(document.getElementById('amount').value),
                currency: "INR",
                receiver_id: "REC_TEST_99",
                receiver_type: document.getElementById('receiver_type').value,
                timestamp: new Date().toISOString(),
                device_id: "DEV_MOBILE_01",
                device_type: "android",
                location: { latitude: 12.9716, longitude: 77.5946 },
                ip_address: "192.168.1.10",
                user_context: {
                    account_age_days: 120,
                    previous_transaction_count": 45,
                    usual_transaction_range: {
                        min: 100.0,
                        max: parseFloat(document.getElementById('usual_max').value)
                    }
                }
            };

            try {
                const res = await fetch('/transactions/evaluate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                
                // Update Banner
                const banner = document.getElementById('decision_banner');
                banner.innerText = data.decision;
                banner.className = 'decision-banner decision-' + data.decision;

                // Update Bars
                const r = data.risk;
                updateBar('composite', r.composite_score, data.decision === 'BLOCK' ? 'var(--block-red)' : (data.decision === 'VERIFY' ? 'var(--verify-yellow)' : 'var(--approve-green)'));
                updateBar('ml', r.anomaly_score, 'var(--accent-blue)');
                updateBar('velocity', r.velocity_score, 'var(--accent-blue)');
                updateBar('receiver', r.receiver_score, 'var(--accent-blue)');
                updateBar('behavior', r.behavioral_score, 'var(--accent-blue)');

                // Update Reasons
                const list = document.getElementById('reason_list');
                list.innerHTML = '';
                if (data.reason_codes.length === 0) {
                    list.innerHTML = '<li>Normal transaction pattern. No risk signals triggered.</li>';
                } else {
                    data.reason_codes.forEach(code => {
                        list.innerHTML += `<li>${code}</li>`;
                    });
                }
            } catch (err) {
                alert('Error running evaluation: ' + err);
            }
        }

        function updateBar(id, val, color) {
            document.getElementById(id + '_val').innerText = val;
            const bar = document.getElementById(id + '_bar');
            bar.style.width = Math.min(100, Math.max(0, val)) + '%';
            if (color) bar.style.background = color;
        }

        // Auto run on load
        evaluateRisk();
    </script>
</body>
</html>
    """


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
