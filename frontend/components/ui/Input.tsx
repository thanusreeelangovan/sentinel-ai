import React from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-text-tertiary">{icon}</div>
        )}
        <input
          className={clsx(
            "w-full bg-background-tertiary border border-border-default rounded-md px-3 py-2 text-text-primary text-sm transition-colors placeholder:text-text-tertiary",
            "focus-visible:outline-none focus-visible:border-accent-blue focus-visible:ring-1 focus-visible:ring-accent-blue",
            icon && "pl-9",
            error && "border-accent-block",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-accent-block">{error}</span>}
    </div>
  )
);

Input.displayName = "Input";

export { Input };
