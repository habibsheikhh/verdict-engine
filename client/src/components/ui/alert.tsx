import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 text-xs [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-zinc-300",
  {
    variants: {
      variant: {
        default: "bg-zinc-900/60 text-zinc-200 border-white/[0.08]",
        success:
          "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 [&>svg]:text-emerald-400",
        destructive:
          "bg-rose-500/10 text-rose-300 border-rose-500/20 [&>svg]:text-rose-400",
        warning:
          "bg-amber-500/10 text-amber-300 border-amber-500/20 [&>svg]:text-amber-400",
        purple:
          "bg-purple-500/10 text-purple-300 border-purple-500/20 [&>svg]:text-purple-400",
        info: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20 [&>svg]:text-indigo-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };

