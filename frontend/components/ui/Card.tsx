import React from "react";
import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  bordered?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, bordered = true, ...props }, ref) => (
    <div
      className={clsx(
        "bg-background-card rounded-lg p-5 transition-colors hover:bg-background-tertiary",
        bordered && "border border-border-default",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Card.displayName = "Card";

export { Card };
