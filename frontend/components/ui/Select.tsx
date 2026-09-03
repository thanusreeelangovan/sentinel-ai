import React from "react";
import clsx from "clsx";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-text-secondary">
          {label}
        </label>
      )}
      <select
        className={clsx(
          "w-full bg-background-tertiary border border-border-default rounded-md px-3 py-2 text-text-primary text-sm transition-colors cursor-pointer",
          "focus-visible:outline-none focus-visible:border-accent-blue focus-visible:ring-1 focus-visible:ring-accent-blue",
          error && "border-accent-block",
          className
        )}
        ref={ref}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-accent-block">{error}</span>}
    </div>
  )
);

Select.displayName = "Select";

export { Select };
