import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        primary: "bg-gold text-navy shadow-[inset_0_0_0_2.5px_#3b2a1f,0_4px_0_#3b2a1f] hover:bg-gold-deep active:translate-y-[3px] active:shadow-[inset_0_0_0_2.5px_#3b2a1f,0_1px_0_#3b2a1f]",
        navy: "bg-navy text-cream hover:bg-navy-soft shadow-[0_4px_0_#141a32]",
        soft: "bg-white text-navy shadow-[inset_0_0_0_2.5px_#3b2a1f,0_4px_0_#3b2a1f] hover:bg-cream active:translate-y-[3px] active:shadow-[inset_0_0_0_2.5px_#3b2a1f,0_1px_0_#3b2a1f]",
        ghost: "text-navy hover:bg-navy/5",
        sage: "bg-sage text-white hover:bg-sage-deep",
        danger: "bg-red-600 text-white hover:bg-red-700",
        link: "text-navy underline underline-offset-4 hover:text-navy-soft",
      },
      size: {
        sm: "h-10 px-4 text-sm rounded-full",
        md: "h-12 px-6 text-base rounded-full",
        lg: "h-14 px-8 text-lg rounded-full",
        xl: "h-16 px-9 text-xl rounded-full",
        icon: "h-12 w-12 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  // data-ui/data-variant: panel admina nadaje przyciskom własny (techniczny) wygląd
  return <Comp data-ui="button" data-variant={variant ?? "primary"} data-size={size ?? "md"} className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";
