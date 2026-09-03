import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium text-sm transition-colors focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-blue text-white hover:bg-blue-600 active:bg-blue-700",
        secondary:
          "bg-background-tertiary text-text-secondary border border-border-default hover:bg-background-card active:bg-background-secondary",
        danger:
          "bg-accent-block text-white hover:bg-red-700 active:bg-red-800",
        success:
          "bg-accent-approve text-white hover:bg-green-700 active:bg-green-800",
        ghost:
          "text-text-secondary hover:bg-background-tertiary hover:text-text-primary",
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
        xl: "px-8 py-4 text-lg",
      },
      rounded: {
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      rounded: "md",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, rounded, ...props }, ref) => (
    <button
      className={clsx(buttonVariants({ variant, size, rounded }), className)}
      ref={ref}
      {...props}
    />
  )
);

Button.displayName = "Button";

export { Button, buttonVariants };
