import React from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import clsx from "clsx";

interface SalamiIndicatorsDisplayProps {
  indicators: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

const RISK_COLORS = {
  LOW: "text-accent-approve",
  MEDIUM: "text-accent-verify",
  HIGH: "text-accent-block",
  CRITICAL: "text-red-500",
};

export function SalamiIndicatorsDisplay({
  indicators,
  riskLevel,
}: SalamiIndicatorsDisplayProps) {
  if (indicators.length === 0) {
    return (
      <Card>
        <div className="text-center py-6">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-sm text-text-tertiary">
            No Salami Attack indicators detected
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            SALAMI ATTACK INDICATORS
          </h3>
          <Badge
            variant={
              riskLevel === "LOW"
                ? "neutral"
                : riskLevel === "MEDIUM"
                  ? "verify"
                  : riskLevel === "HIGH"
                    ? "block"
                    : "block"
            }
            size="sm"
          >
            {riskLevel}
          </Badge>
        </div>

        <div className="space-y-2">
          {indicators.map((indicator, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-background-tertiary rounded-lg"
            >
              <div className="text-lg">🔍</div>
              <span className="text-sm text-text-secondary">{indicator}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
