import * as React from "react";
import { cn } from "../../lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "noShadow" | "secondary" | "danger";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "nb-button",
          variant === "noShadow" && "nb-button-no-shadow",
          variant === "secondary" && "nb-button-secondary",
          variant === "danger" && "nb-button-danger",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
