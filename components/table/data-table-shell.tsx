import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { DataTable, DataTableColumn } from "./data-table";
import { Pagination } from "./pagination";
import { TableToolbar } from "./table-toolbar";
import { cn } from "@/lib/utils";

interface DataTableShellProps<T> {
  // Data
  columns: DataTableColumn<T>[];
  rows: T[];
  totalRows: number;

  // State
  isLoading?: boolean;

  // Search
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Filters & Actions
  filters?: ReactNode;
  actions?: ReactNode;

  // Pagination
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  // Empty State
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;

  // Expandable rows
  getRowCanExpand?: (row: T) => boolean;
  renderExpandedRow?: (row: T) => ReactNode;
  getRowClassName?: (row: T) => string | undefined;
  getRowLeadingBarClassName?: (row: T) => string | undefined;

  /** Fill parent height; table body scrolls (industry list viewport). */
  fillHeight?: boolean;
  className?: string;
}

export function DataTableShell<T>({
  columns,
  rows,
  totalRows,
  isLoading = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder,
  filters,
  actions,
  page = 1,
  pageSize = 20,
  onPageChange = () => {},
  onPageSizeChange = () => {},
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  getRowCanExpand,
  renderExpandedRow,
  getRowClassName,
  getRowLeadingBarClassName,
  fillHeight = false,
  className,
}: DataTableShellProps<T>) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card",
        fillHeight && "h-full min-h-0 flex-1 overflow-hidden",
        className
      )}
    >
      <div className="shrink-0">
        <TableToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          filters={filters}
          actions={actions}
        />
      </div>

      <div
        className={cn(
          fillHeight
            ? "min-h-0 flex-1 overflow-auto overscroll-contain"
            : "overflow-x-auto"
        )}
      >
        <DataTable
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          emptyIcon={emptyIcon}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyAction={emptyAction}
          getRowCanExpand={getRowCanExpand}
          renderExpandedRow={renderExpandedRow}
          getRowClassName={getRowClassName}
          getRowLeadingBarClassName={getRowLeadingBarClassName}
          embedInScrollParent={fillHeight}
        />
      </div>

      {!isLoading && rows.length > 0 && (
        <div className="shrink-0">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalRows={totalRows}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
}
