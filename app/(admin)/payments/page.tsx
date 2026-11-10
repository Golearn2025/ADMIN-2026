"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DollarSign } from "lucide-react";
import { PageHeader } from "@/components/common";
import { DataTableShell } from "@/components/table";
import { DataTableColumn } from "@/components/table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/apiClient";

type PaymentRow = {
  id: string;
  reference: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  display_price_pence: number | null;
  latest_payment_status: string | null;
  latest_payment_amount_pence: number | null;
  created_at: string | null;
};

function gbp(pence: number | null | undefined) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format((Number(pence) || 0) / 100);
}

export default function PaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          search: searchValue,
        });
        const res = await apiFetch(`/api/admin/bookings?${params}`);
        const data = await res.json();
        if (!cancelled && res.ok) {
          setRows(data.bookings || data.data || []);
          setTotal(data.total || 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, searchValue]);

  const columns: DataTableColumn<PaymentRow>[] = useMemo(
    () => [
      {
        key: "ref",
        header: "Booking",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.reference || row.id.slice(0, 8)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[row.customer_first_name, row.customer_last_name]
                .filter(Boolean)
                .join(" ") || "—"}
            </p>
          </div>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        cell: (row) => (
          <span className="tabular-nums">
            {gbp(row.latest_payment_amount_pence ?? row.display_price_pence)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Payment",
        cell: (row) => (
          <Badge variant="secondary">
            {(row.latest_payment_status || "no_payment").toUpperCase()}
          </Badge>
        ),
      },
      {
        key: "created",
        header: "Created",
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.created_at
              ? new Date(row.created_at).toLocaleDateString("en-GB")
              : "—"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Payments"
        subtitle="Payment status from bookings (SSOT admin_booking_list)"
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/bookings">Open Bookings</Link>
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3 sm:px-4 md:px-6">
        <DataTableShell
          fillHeight
          columns={columns}
          rows={rows}
          totalRows={total}
          isLoading={loading}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search bookings…"
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          emptyIcon={DollarSign}
          emptyTitle="No payments"
          emptyDescription="Payment rows appear from bookings with payment status."
        />
      </div>
    </div>
  );
}
