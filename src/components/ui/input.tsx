import * as React from "react";
import { cn } from "../../lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("nb-input nb-dialog-input", className)} {...props} />
));

Input.displayName = "Input";

export { Input };
