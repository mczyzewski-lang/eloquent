import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    data-ui="input"
    className={cn(
      "h-14 w-full rounded-2xl border-2 border-navy/10 bg-white px-5 text-lg text-navy placeholder:text-muted/70 shadow-sm transition focus:border-gold-deep focus:outline-none focus:ring-4 focus:ring-gold/30",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label data-ui="label" className={cn("mb-2 block font-display text-base font-semibold text-navy", className)} {...props} />;
}
