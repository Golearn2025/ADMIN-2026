import { ReactNode } from "react";
import { Search } from "lucide-react";

interface TableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function TableToolbar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  actions,
}: TableToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-6 py-4">
      <div className="flex flex-1 items-center gap-4">
        {/* Search Input */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Filters Slot */}
        {filters && <div className="flex items-center gap-2">{filters}</div>}
      </div>

      {/* Actions Slot */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
