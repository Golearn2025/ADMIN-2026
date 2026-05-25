"use client";

import { BookingExpandedTabs } from "@/components/bookings/expanded-details/booking-expanded-tabs";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { useBookingExpandedData } from "@/lib/bookings/use-booking-expanded-data";
import { BookingDetailsBar } from "./booking-details-bar";
import { FleetSlotsTable } from "./fleet-slots-table";
import { ReturnLegsTable } from "./return-legs-table";
import type { Booking } from "./types";

interface BookingExpandedRowProps {
  booking: Booking;
}

export function BookingExpandedRow({ booking }: BookingExpandedRowProps) {
  const isReturn = booking.booking_type === "return";
  const isFleet = booking.booking_type === "fleet";

  const {
    legs,
    slots,
    extras,
    payments,
    economics,
    economicsError,
    isLoadingStructure,
    isLoadingDetails,
  } = useBookingExpandedData({
    bookingId: booking.id,
    isReturn,
    isFleet,
  });

  if (isLoadingStructure) {
    return (
      <div className="space-y-4 py-4">
        <LoadingSkeleton variant="table" rows={2} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 py-4">
      {isReturn && legs.length > 0 && (
        <>
          <ReturnLegsTable legs={legs} />
          <div className="border-t border-border pt-4 sm:pt-6">
            <BookingDetailsBar booking={booking} />
          </div>
        </>
      )}

      {isFleet && slots.length > 0 && (
        <>
          <FleetSlotsTable slots={slots} />
          <div className="border-t border-border pt-4 sm:pt-6">
            <BookingDetailsBar booking={booking} />
          </div>
        </>
      )}

      {!isReturn && !isFleet && <BookingDetailsBar booking={booking} />}

      <div className="border-t border-border pt-4">
        <BookingExpandedTabs
          extras={extras}
          payments={payments}
          economics={economics}
          economicsError={economicsError}
          isLoadingDetails={isLoadingDetails}
        />
      </div>
    </div>
  );
}
