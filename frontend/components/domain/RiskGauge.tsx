import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { RiskBreakdown } from "@/lib/types";
import { calculateWeightedRisk } from "@/lib/utils";

interface RiskGaugeProps {
  breakdown: RiskBreakdown;
  size?: "sm" | "md" | "lg";
}

export function RiskGauge({ breakdown, size = "md" }: RiskGaugeProps) {
  const score = calculateWeightedRisk(breakdown);
  const percentage = (score / 100) * 100;

  const colors =
    score <= 40
      ? "from-accent-approve to-accent-approve"
      : score <= 70
        ? "from-accent-verify to-accent-verify"
        : "from-accent-block to-accent-block";

  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-32 h-32",
    lg: "w-48 h-48",
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={clsx(sizeClasses[size], "relative")}>
        {/* Background circle */}
        <svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-background-tertiary"
          />
          {/* Progress track */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${(percentage / 100) * 282.6} 282.6`}
            className={clsx("text-accent-blue transition-all duration-500", {
              "text-accent-approve": score <= 40,
              "text-accent-verify": score > 40 && score <= 70,
              "text-accent-block": score > 70,
            })}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <div
            className={clsx("font-bold", {
              "text-2xl": size === "sm",
              "text-4xl": size === "md",
              "text-6xl": size === "lg",
            })}
          >
            {score}
          </div>
          <div className="text-xs text-text-tertiary">/ 100</div>
        </div>
      </div>

      {/* Score components */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <div className="text-center">
          <div className="text-xs text-text-tertiary">Anomaly</div>
          <div className="text-sm font-semibold">{breakdown.anomaly}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-text-tertiary">Velocity</div>
          <div className="text-sm font-semibold">{breakdown.velocity}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-text-tertiary">Receiver</div>
          <div className="text-sm font-semibold">{breakdown.receiver}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-text-tertiary">Behavioral</div>
          <div className="text-sm font-semibold">{breakdown.behavioral}</div>
        </div>
      </div>
    </div>
  );
}

import clsx from "clsx";
