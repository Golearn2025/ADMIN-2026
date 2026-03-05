import { EmptyState } from "@/components/common/empty-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { ChevronDown, ChevronRight, LucideIcon } from "lucide-react";
import { Fragment, useState } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  // Expandable rows support
  getRowCanExpand?: (row: T) => boolean;
  renderExpandedRow?: (row: T) => React.ReactNode;
  // Custom key extractor for row uniqueness
  getRowKey?: (row: T, index: number) => string | number;
}

export function DataTable<T>({
  columns,
  rows,
  isLoading = false,
  emptyIcon,
  emptyTitle = "No data",
  emptyDescription = "No records found.",
  emptyAction,
  getRowCanExpand,
  renderExpandedRow,
  getRowKey = (_, index) => index,
}: DataTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

  const toggleRow = (rowIndex: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSkeleton variant="table" rows={5} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const hasExpandableRows = getRowCanExpand && renderExpandedRow;

  return (
    <div className="overflow-x-auto" role="region" aria-label="Data table">
      <table className="w-full" role="table">
        <thead>
          <tr className="border-b border-border bg-muted/50" role="row">
            {hasExpandableRows && (
              <th className="px-3 py-3 w-10" scope="col" aria-label="Expand row"></th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {rows.map((row, rowIndex) => {
            const canExpand = hasExpandableRows && getRowCanExpand(row);
            const isExpanded = expandedRows.has(rowIndex);

            return (
              <Fragment key={rowIndex}>
                <tr
                  className="transition-colors hover:bg-muted/50"
                  role="row"
                >
                  {hasExpandableRows && (
                    <td className="px-3 py-4 w-10" role="cell">
                      {canExpand && (
                        <button
                          onClick={() => toggleRow(rowIndex)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={isExpanded ? "Collapse row" : "Expand row"}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      )}
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-6 py-4 text-sm text-foreground"
                      role="cell"
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
                {canExpand && isExpanded && (
                  <tr key={`${rowIndex}-expanded`}>
                    <td colSpan={columns.length + 1} className="px-6 py-4 bg-muted/30">
                      {renderExpandedRow(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
