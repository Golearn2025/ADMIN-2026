import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-bold tracking-wide transition-colors backdrop-blur-sm",
  {
    variants: {
      variant: {
        default:
          "border-primary/40 bg-primary/15 text-primary shadow hover:bg-primary/20",
        secondary:
          "border-secondary/40 bg-secondary/15 text-secondary-foreground hover:bg-secondary/20",
        destructive:
          "border-destructive/40 bg-destructive/15 text-destructive shadow hover:bg-destructive/20",
        outline: "text-foreground border-border/40 bg-background/50",
        success:
          "border-green-500/40 bg-green-500/15 text-green-400 shadow hover:bg-green-500/20",
        warning:
          "border-amber-500/40 bg-amber-500/15 text-amber-400 shadow hover:bg-amber-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
