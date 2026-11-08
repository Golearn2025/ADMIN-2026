"use client";

import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/table";
import { formatMoney, type OperatingCostRow } from "@/lib/operating-costs/types";
import { Trash2 } from "lucide-react";

export function getOperatingCostColumns(handlers: {
  onToggleStatus: (row: OperatingCostRow) => void;
  onTogglePayment: (row: OperatingCostRow) => void;
  onDelete: (row: OperatingCostRow) => void;
}): DataTableColumn<OperatingCostRow>[] {
  return [
    {
      key: "start_date",
      header: "Date",
      width: "110px",
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground whitespace-nowrap">
          {row.start_date}
        </span>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium leading-tight">{row.vendor_name}</p>
          {row.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[280px]">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      width: "120px",
      cell: (row) => (
        <span className="capitalize text-muted-foreground">{row.category}</span>
      ),
    },
    {
      key: "cadence",
      header: "Cadence",
      width: "110px",
      cell: (row) => (
        <span className="text-[10px] uppercase tracking-wide rounded bg-secondary px-1.5 py-0.5 text-muted-foreground">
          {row.cadence}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: "140px",
      cell: (row) => {
        const cur = (row.currency || "GBP").toUpperCase();
        const gbpPence =
          typeof row.amount_gbp_pence === "number"
            ? row.amount_gbp_pence
            : cur === "GBP"
              ? row.amount_pence
              : null;
        return (
          <div className="text-right">
            <span className="tabular-nums font-medium whitespace-nowrap block">
              {formatMoney(row.amount_pence, row.currency)}
            </span>
            {cur !== "GBP" && gbpPence != null && (
              <span className="tabular-nums text-[10px] text-muted-foreground whitespace-nowrap block">
                ≈ {formatMoney(gbpPence, "GBP")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "monthly",
      header: "≈ / mo GBP",
      width: "110px",
      cell: (row) => {
        // Always GBP: prefer dedicated field, else enriched monthly_equivalent_pence
        const monthlyGbp =
          typeof row.monthly_equivalent_gbp_pence === "number"
            ? row.monthly_equivalent_gbp_pence
            : row.monthly_equivalent_pence;
        const isOneShot =
          row.cadence === "one_time" &&
          !(row.amortize_months != null && row.amortize_months > 0);
        return (
          <span
            className="tabular-nums text-muted-foreground whitespace-nowrap block text-right"
            title={
              isOneShot
                ? "One-time — does not add to monthly burn"
                : "Monthly equivalent in GBP (ECB FX)"
            }
          >
            {isOneShot
              ? formatMoney(0, "GBP")
              : formatMoney(monthlyGbp || 0, "GBP")}
          </span>
        );
      },
    },
    {
      key: "invoice_ref",
      header: "Invoice ref",
      width: "160px",
      cell: (row) => (
        <span className="text-xs font-mono text-muted-foreground truncate block max-w-[160px]">
          {row.invoice_ref || "—"}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      width: "100px",
      cell: (row) => {
        const paid = row.payment_status === "paid";
        return (
          <span
            className={
              paid
                ? "text-xs font-medium text-emerald-600"
                : "text-xs font-medium text-amber-700"
            }
          >
            {paid ? "paid" : "unpaid"}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      width: "90px",
      cell: (row) => (
        <span
          className={
            row.status === "active"
              ? "text-emerald-600 text-xs font-medium"
              : "text-muted-foreground text-xs font-medium"
          }
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "160px",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => handlers.onTogglePayment(row)}
          >
            {row.payment_status === "paid" ? "Unpaid" : "Paid"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => handlers.onToggleStatus(row)}
          >
            {row.status === "active" ? "End" : "On"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive"
            onClick={() => handlers.onDelete(row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
