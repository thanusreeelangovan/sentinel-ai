import React from "react";
import clsx from "clsx";

interface MetricProps {
  label: string;
  value: string | number;
  suffix?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string | number;
  icon?: React.ReactNode;
}

const Metric: React.FC<MetricProps> = ({
  label,
  value,
  suffix,
  trend,
  trendValue,
  icon,
}) => {
  const trendColor = {
    up: "text-accent-approve",
    down: "text-accent-block",
    neutral: "text-text-tertiary",
  };

  return (
    <div className="bg-background-card border border-border-default rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-text-tertiary text-sm font-semibold">
          {label}
        </span>
        {icon && <div className="text-lg">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-text-primary">
          {value}
          {suffix && <span className="text-lg font-semibold">{suffix}</span>}
        </span>
      </div>

      {trend && trendValue && (
        <div className={clsx("text-sm font-medium", trendColor[trend])}>
          {trend === "up" && "↑ "}
          {trend === "down" && "↓ "}
          {trendValue}
        </div>
      )}
    </div>
  );
};

export { Metric };
