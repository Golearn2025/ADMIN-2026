"use client";

import { PageHeader } from "@/components/common/page-header";
import { DataTableShell } from "@/components/table";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { BookingExpandedRow } from "./booking-expanded-row";
import { columns } from "./bookings.columns";
import type { Booking } from "./types";

export default function BookingsPage() {
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          search: searchValue,
        });

        const response = await fetch(`/api/admin/bookings?${params}`);
        const result = await response.json();

        if (response.ok) {
          setBookings(result.data);
          setTotal(result.total);
        } else {
          console.error("Failed to fetch bookings:", result.error);
        }
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [page, pageSize, searchValue]);

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
          rows={bookings}
          totalRows={total}
          isLoading={isLoading}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by reference, customer name or phone..."
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          emptyIcon={Calendar}
          emptyTitle="No bookings found"
          emptyDescription="No bookings match your search criteria."
          getRowCanExpand={() => true}
          renderExpandedRow={(row) => <BookingExpandedRow booking={row} />}
        />
      </div>
    </div>
  );
}
