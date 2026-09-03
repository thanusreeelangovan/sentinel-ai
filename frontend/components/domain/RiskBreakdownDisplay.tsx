import React from "react";
import { Card } from "@/components/ui/Card";
import clsx from "clsx";

interface RiskBreakdownDisplayProps {
  anomaly: number;
  velocity: number;
  receiver: number;
  behavioral: number;
}

export function RiskBreakdownDisplay({
  anomaly,
  velocity,
  receiver,
  behavioral,
}: RiskBreakdownDisplayProps) {
  const components = [
    { label: "Anomaly", value: anomaly, weight: "40%", color: "bg-red-500" },
    {
      label: "Velocity",
      value: velocity,
      weight: "25%",
      color: "bg-yellow-500",
    },
    {
      label: "Receiver",
      value: receiver,
      weight: "20%",
      color: "bg-orange-500",
    },
    {
      label: "Behavioral",
      value: behavioral,
      weight: "15%",
      color: "bg-pink-500",
    },
  ];

  return (
    <Card>
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">
          RISK BREAKDOWN
        </h3>

        {components.map((comp) => (
          <div key={comp.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-text-secondary">
                  {comp.label}
                </div>
                <div className="text-xs text-text-tertiary">{comp.weight}</div>
              </div>
              <div className="text-lg font-bold text-text-primary">
                {comp.value}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-background-tertiary rounded-full overflow-hidden">
              <div
                className={clsx(comp.color, "h-full transition-all")}
                style={{ width: `${Math.min(comp.value, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
