import { ReactNode, useState } from "react";
import { LucideIcon } from "lucide-react";
import { DataTable, DataTableColumn } from "./data-table";
import { TableToolbar } from "./table-toolbar";
import { Pagination } from "./pagination";

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
}: DataTableShellProps<T>) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      {/* Toolbar */}
      <TableToolbar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        actions={actions}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        emptyIcon={emptyIcon}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        emptyAction={emptyAction}
      />

      {/* Pagination */}
      {!isLoading && rows.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalRows={totalRows}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
