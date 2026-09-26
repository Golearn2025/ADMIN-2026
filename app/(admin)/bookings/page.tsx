"use client";

import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { DataTableShell } from "@/components/table";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { BookingExpandedRow } from "./booking-expanded-row";
import { columns } from "./bookings.columns";
import { isBookingUnassigned, isPaidUpcomingBooking } from "./bookings.utils";
import { NextUpStrip } from "./next-up-strip";
import type { Booking } from "./types";
import { apiFetch } from "@/lib/api/apiClient";

export default function BookingsPage() {
  const [searchValue, setSearchValue] = useState("");
  // Debounce search to reduce API calls by ~80%
  const debouncedSearch = useDeferredValue(searchValue);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nextUp, setNextUp] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          search: debouncedSearch,
        });

        const response = await apiFetch(`/api/admin/bookings?${params}`);
        const result = await response.json();

        if (response.ok) {
          setBookings(result.data);
          setNextUp(Array.isArray(result.nextUp) ? result.nextUp : []);
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
  }, [page, pageSize, debouncedSearch]);

  const focusBooking = (booking: Booking) => {
    setSearchValue(booking.reference);
    setPage(1);
    // Allow search debounce + fetch, then scroll to row
    window.setTimeout(() => {
      const el = document.querySelector(`[data-booking-ref="${booking.reference}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 600);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle="Manage all transportation bookings"
        actions={
          <Button asChild>
            <Link href="/jobs/new">
              <Plus className="h-4 w-4" />
              New Booking
            </Link>
          </Button>
        }
      />
      <div className="px-6">
        <NextUpStrip bookings={nextUp} onSelect={focusBooking} />
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
          getRowClassName={(row) => {
            if (!isPaidUpcomingBooking(row)) return undefined;
            return isBookingUnassigned(row)
              ? "booking-row-next-up booking-row-next-up-warn"
              : "booking-row-next-up booking-row-next-up-info";
          }}
        />
      </div>
    </div>
  );
}
