"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/table";
import {
  formatGbp,
  formatLondonDate,
  type DriverPayoutWeekly,
} from "@/lib/features/driver-payouts";

function statusBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge variant="success">Paid</Badge>;
    case "exported":
      return <Badge variant="warning">Exported</Badge>;
    case "partial":
      return <Badge variant="warning">Partial</Badge>;
    case "skipped":
      return <Badge variant="secondary">Skipped</Badge>;
    default:
      return <Badge variant="destructive">Unpaid</Badge>;
  }
}

export type DriverPayoutWeeklyRow = DriverPayoutWeekly & {
  nrCrt: number;
};

export function getDriverPayoutColumns(handlers: {
  onExportWise: (row: DriverPayoutWeeklyRow) => void;
  actionLoading: boolean;
  isRowSelected: (row: DriverPayoutWeeklyRow) => boolean;
  isRowIndeterminate: (row: DriverPayoutWeeklyRow) => boolean;
  onToggleRow: (row: DriverPayoutWeeklyRow) => void;
  allPageSelected: boolean;
  somePageSelected: boolean;
  onTogglePage: () => void;
}): DataTableColumn<DriverPayoutWeeklyRow>[] {
  return [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          aria-label="Select all on page"
          checked={handlers.allPageSelected}
          ref={(el) => {
            if (el) el.indeterminate = handlers.somePageSelected && !handlers.allPageSelected;
          }}
          onChange={handlers.onTogglePage}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      width: "44px",
      cell: (row) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.driver_name} ${row.week_key}`}
          checked={handlers.isRowSelected(row)}
          ref={(el) => {
            if (el) el.indeterminate = handlers.isRowIndeterminate(row);
          }}
          onChange={() => handlers.onToggleRow(row)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "nr_crt",
      header: "Nr.",
      width: "56px",
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground">{row.nrCrt}</span>
      ),
    },
    {
      key: "week",
      header: "Week",
      width: "160px",
      cell: (row) => (
        <div className="whitespace-nowrap">
          <div className="font-medium">{row.week_key}</div>
          <div className="text-xs text-muted-foreground">
            {formatLondonDate(row.week_start_london)} –{" "}
            {formatLondonDate(row.week_end_london)}
          </div>
        </div>
      ),
    },
    {
      key: "driver",
      header: "Driver",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.driver_name}</div>
          <div className="text-xs text-muted-foreground">
            {row.account_holder_name || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "jobs",
      header: "Jobs",
      width: "72px",
      cell: (row) => (
        <span className="tabular-nums">{row.jobs_count}</span>
      ),
    },
    {
      key: "client_paid",
      header: "Client paid",
      width: "110px",
      cell: (row) => (
        <span className="tabular-nums">{formatGbp(row.client_paid_pence)}</span>
      ),
    },
    {
      key: "driver_owed",
      header: "Driver owed",
      width: "110px",
      cell: (row) => (
        <span className="tabular-nums font-medium">
          {formatGbp(row.driver_owed_pence)}
        </span>
      ),
    },
    {
      key: "bank",
      header: "Bank",
      width: "90px",
      cell: (row) =>
        row.has_uk_bank_details ? (
          <Badge variant="success">{row.account_number_last4 || "OK"}</Badge>
        ) : (
          <Badge variant="destructive">Missing</Badge>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: "100px",
      cell: (row) => statusBadge(row.week_payout_status),
    },
    {
      key: "actions",
      header: "Actions",
      width: "100px",
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          disabled={
            handlers.actionLoading ||
            !row.has_uk_bank_details ||
            row.driver_owed_pence <= 0
          }
          onClick={(e) => {
            e.stopPropagation();
            handlers.onExportWise(row);
          }}
        >
          Wise
        </Button>
      ),
    },
  ];
}

export { statusBadge };
