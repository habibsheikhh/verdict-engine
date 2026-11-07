import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold tracking-wide border transition-colors",
  {
    variants: {
      variant: {
        default: "bg-white/[0.08] text-zinc-200 border-white/[0.10]",
        easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        hard: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        error: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        info: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        muted: "bg-zinc-800/60 text-zinc-400 border-zinc-700/60",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

