"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import type { ProcessingStep } from "@/lib/types";

interface ProcessingStepItem {
  step: ProcessingStep;
  label: string;
  icon: string;
  description: string;
}

const PROCESSING_STEPS: ProcessingStepItem[] = [
  {
    step: "received",
    label: "Transaction Received",
    icon: "✅",
    description: "Processing initiated",
  },
  {
    step: "intercepted",
    label: "Intercepted",
    icon: "🧬",
    description: "Analyzing transaction",
  },
  {
    step: "behavioral_analysis",
    label: "Behavioral Analysis",
    icon: "📊",
    description: "Comparing behavioral patterns",
  },
  {
    step: "salami_detection",
    label: "Salami Attack Detection",
    icon: "🔍",
    description: "Scanning for micro-deductions",
  },
  {
    step: "risk_calculation",
    label: "Risk Score Calculation",
    icon: "🎯",
    description: "Computing composite score",
  },
  {
    step: "decision_engine",
    label: "Decision Engine",
    icon: "⚙️",
    description: "Evaluating thresholds",
  },
  {
    step: "completed",
    label: "Final Decision",
    icon: "🛡️",
    description: "SentinelAI decision ready",
  },
];

interface ProcessingPipelineProps {
  currentStep: ProcessingStep | null;
  isProcessing: boolean;
}

export function ProcessingPipeline({
  currentStep,
  isProcessing,
}: ProcessingPipelineProps) {
  const currentStepIndex = currentStep
    ? PROCESSING_STEPS.findIndex((s) => s.step === currentStep)
    : -1;

  return (
    <Card>
      <div className="space-y-3">
        {PROCESSING_STEPS.map((item, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div
              key={item.step}
              className="flex items-start gap-4 opacity-transition"
              style={{
                opacity: isCompleted || isCurrent || !isProcessing ? 1 : 0.3,
                transitionDelay: `${index * 0.1}s`,
              }}
            >
              {/* Icon */}
              <div
                className={`text-2xl min-w-max transition-all ${
                  isCurrent ? "animate-pulse" : ""
                }`}
              >
                {item.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="text-sm font-semibold text-text-primary">
                  {item.label}
                </div>
                <div className="text-xs text-text-tertiary">
                  {item.description}
                </div>
              </div>

              {/* Status indicator */}
              {isCompleted && (
                <div className="text-accent-approve text-xs font-medium">
                  ✓
                </div>
              )}
              {isCurrent && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                  <span className="text-xs text-accent-blue font-medium">
                    Processing
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
