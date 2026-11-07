import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/[0.08]",
        primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/40",
        ghost: "hover:bg-white/[0.05] text-zinc-400 hover:text-zinc-200",
        link: "text-zinc-400 hover:text-zinc-200 underline-offset-4 hover:underline p-0 h-auto",
        destructive: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20",
        outline: "border border-white/[0.10] bg-transparent hover:bg-white/[0.04] text-zinc-300",
      },
      size: {
        default: "h-8 px-4 py-2 text-xs",
        sm: "h-7 px-3 text-xs",
        lg: "h-10 px-6 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

