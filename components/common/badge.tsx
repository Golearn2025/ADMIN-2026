import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        success:
          "bg-green-500/10 text-green-500 border border-green-500/20",
        warning:
          "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
        error:
          "bg-red-500/10 text-red-500 border border-red-500/20",
        neutral:
          "bg-muted text-muted-foreground border border-border",
        info:
          "bg-blue-500/10 text-blue-500 border border-blue-500/20",
        primary:
          "bg-primary/10 text-primary border border-primary/20",
        purple:
          "bg-purple-500/10 text-purple-500 border border-purple-500/20",
        dark:
          "bg-slate-900/10 text-slate-900 border border-slate-900/20 dark:bg-slate-100/10 dark:text-slate-100 dark:border-slate-100/20",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
