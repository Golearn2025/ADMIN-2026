import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  variant?: "table" | "card";
  rows?: number;
  className?: string;
}

export function LoadingSkeleton({
  variant = "card",
  rows = 5,
  className,
}: LoadingSkeletonProps) {
  if (variant === "table") {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Table Header */}
        <div className="flex gap-4 border-b border-border pb-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-4 flex-1 animate-pulse rounded bg-muted"
            />
          ))}
        </div>

        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {[1, 2, 3, 4].map((j) => (
              <div
                key={j}
                className="h-8 flex-1 animate-pulse rounded bg-muted"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card p-6 space-y-3"
        >
          <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
