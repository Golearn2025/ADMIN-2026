"use client";

import { Badge } from "@/components/common/badge";
import { PageHeader } from "@/components/common/page-header";
import { DataTableColumn, DataTableShell } from "@/components/table";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { useState } from "react";

interface Booking {
  id: string;
  customerName: string;
  status: string;
  date: string;
}

const dummyBookings: Booking[] = [
  { id: "BK-001", customerName: "Test Customer 1", status: "confirmed", date: "2024-03-15" },
  { id: "BK-002", customerName: "Test Customer 2", status: "pending", date: "2024-03-16" },
];

const columns: DataTableColumn<Booking>[] = [
  {
    key: "id",
    header: "ID",
    cell: (row) => <span className="font-mono">{row.id}</span>,
  },
  {
    key: "customer",
    header: "Customer",
    cell: (row) => row.customerName,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge variant={row.status === "confirmed" ? "success" : "warning"}>
        {row.status}
      </Badge>
    ),
  },
  {
    key: "date",
    header: "Date",
    cell: (row) => row.date,
  },
];

export default function BookingsPage() {
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle="Manage all transportation bookings"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        }
      />
      <div className="px-6">
        <DataTableShell
          columns={columns}
          rows={dummyBookings}
          totalRows={dummyBookings.length}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search bookings..."
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          emptyIcon={Calendar}
          emptyTitle="No bookings found"
          emptyDescription="No bookings match your search criteria."
        />
      </div>
    </div>
  );
}
