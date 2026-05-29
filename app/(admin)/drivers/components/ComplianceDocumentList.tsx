"use client";

import { Badge } from "@/components/ui/badge";
import type { ComplianceDocRow } from "@/lib/features/drivers/compliance.utils";

const STATUS_VARIANT: Record<
  ComplianceDocRow["status"],
  "success" | "secondary" | "destructive" | "warning" | "outline"
> = {
  approved: "success",
  pending: "secondary",
  rejected: "destructive",
  expired: "warning",
  missing: "outline",
};

const STATUS_LABEL: Record<ComplianceDocRow["status"], string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
  expired: "Expired",
  missing: "Missing",
};

interface ComplianceDocumentListProps {
  rows: ComplianceDocRow[];
  emptyMessage?: string;
}

export function ComplianceDocumentList({
  rows,
  emptyMessage = "No documents",
}: ComplianceDocumentListProps) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-4">{emptyMessage}</p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 bg-card"
        >
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-sm font-medium leading-snug break-words">{row.label}</p>
            {row.vehicleLabel ? (
              <p className="text-xs text-muted-foreground mt-0.5 break-words">
                {row.vehicleLabel}
              </p>
            ) : null}
            {row.expiryDate ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Exp: {new Date(row.expiryDate).toLocaleDateString("en-GB")}
              </p>
            ) : null}
          </div>
          <div className="flex justify-center sm:justify-end shrink-0">
            <Badge variant={STATUS_VARIANT[row.status]} className="whitespace-nowrap">
              {STATUS_LABEL[row.status]}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
