import { cn } from "@/lib/utils";

interface VehiclePlateBadgeProps {
  plate: string;
  className?: string;
}

/** Compact UK-style plate chip for booking tables */
export function VehiclePlateBadge({ plate, className }: VehiclePlateBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-amber-400/50",
        "bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-[0.12em]",
        "text-slate-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100",
        className
      )}
      title="Vehicle registration"
    >
      {plate.toUpperCase()}
    </span>
  );
}
