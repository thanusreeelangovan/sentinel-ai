"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DECISION_COLORS, DECISION_MESSAGES } from "@/lib/utils";
import clsx from "clsx";

interface DecisionDisplayProps {
  decision: "APPROVE" | "VERIFY" | "BLOCK";
  score: number;
  explanation?: string;
  reasonCodes?: string[];
}

export function DecisionDisplay({
  decision,
  score,
  explanation,
  reasonCodes = [],
}: DecisionDisplayProps) {
  const colors = DECISION_COLORS[decision];

  return (
    <Card
      className={clsx(
        "border-2",
        decision === "APPROVE" && "border-accent-approve border-opacity-30",
        decision === "VERIFY" && "border-accent-verify border-opacity-30",
        decision === "BLOCK" && "border-accent-block border-opacity-30"
      )}
    >
      <div className="flex gap-6">
        {/* Icon */}
        <div className="text-5xl flex-shrink-0">{colors.icon}</div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {/* Decision */}
          <div>
            <p className="text-xs text-text-tertiary mb-1">DECISION</p>
            <p className={clsx("text-3xl font-bold", colors.text)}>
              {decision}
            </p>
          </div>

          {/* Message */}
          <p className="text-sm text-text-secondary">
            {explanation || DECISION_MESSAGES[decision]}
          </p>

          {/* Reason codes */}
          {reasonCodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-text-tertiary font-semibold">
                REASON CODES
              </p>
              <div className="flex flex-wrap gap-2">
                {reasonCodes.map((code, idx) => (
                  <Badge key={idx} variant="neutral" size="sm">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Score indicator */}
          <div className="flex items-center gap-2 text-xs">
            <div className="h-1 flex-1 bg-background-tertiary rounded-full overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all",
                  score <= 40 && "bg-accent-approve",
                  score > 40 && score <= 70 && "bg-accent-verify",
                  score > 70 && "bg-accent-block"
                )}
                style={{ width: `${Math.min(score, 100)}%` }}
              />
            </div>
            <span className="text-text-tertiary">Score: {score}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
