import React from "react";
import clsx from "clsx";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "approve" | "verify" | "block" | "neutral" | "info";
  size?: "sm" | "md" | "lg";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "neutral", size = "md", children, ...props }, ref) => {
    const variantClasses = {
      approve:
        "bg-accent-approve bg-opacity-15 text-accent-approve border border-accent-approve border-opacity-30",
      verify:
        "bg-accent-verify bg-opacity-15 text-accent-verify border border-accent-verify border-opacity-30",
      block:
        "bg-accent-block bg-opacity-15 text-accent-block border border-accent-block border-opacity-30",
      neutral:
        "bg-background-tertiary text-text-secondary border border-border-default",
      info: "bg-accent-blue bg-opacity-15 text-accent-blue border border-accent-blue border-opacity-30",
    };

    const sizeClasses = {
      sm: "px-2 py-1 text-xs font-medium rounded",
      md: "px-3 py-1.5 text-sm font-semibold rounded-md",
      lg: "px-4 py-2 text-base font-semibold rounded-lg",
    };

    return (
      <div
        className={clsx(
          "inline-flex items-center justify-center font-medium",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
