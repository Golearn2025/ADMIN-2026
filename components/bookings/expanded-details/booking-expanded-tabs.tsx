"use client";

import { BookingEconomicsPanel } from "@/components/bookings/economics";
import { BookingActivityPanel } from "@/components/bookings/booking-activity-panel";
import { BookingTripDetailsTab } from "@/components/bookings/expanded-details/booking-trip-details-tab";
import type { BookingExtras, BookingPayment } from "@/components/bookings/expanded-details/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BookingEconomicsResponse } from "@/lib/bookings/economics/types";
import { ClipboardList, History, TrendingUp } from "lucide-react";

type BookingExpandedTabsProps = {
  bookingId: string;
  extras: BookingExtras | null;
  payments: BookingPayment[];
  economics: BookingEconomicsResponse | null;
  economicsError: string | null;
  isLoadingDetails: boolean;
  scheduledAt?: string | null;
  returnScheduledAt?: string | null;
  activityRefreshKey?: number;
};

export function BookingExpandedTabs({
  bookingId,
  extras,
  payments,
  economics,
  economicsError,
  isLoadingDetails,
  scheduledAt,
  returnScheduledAt,
  activityRefreshKey = 0,
}: BookingExpandedTabsProps) {
  if (isLoadingDetails) {
    return <div className="h-24 bg-muted/20 animate-pulse rounded-lg" />;
  }

  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="h-auto min-h-10 w-full sm:w-auto flex-wrap gap-1 border-b border-border bg-transparent p-0 mb-4">
        <TabsTrigger value="details" className="text-xs sm:text-sm px-3 sm:px-4 gap-1.5">
          <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Trip details
        </TabsTrigger>
        <TabsTrigger value="activity" className="text-xs sm:text-sm px-3 sm:px-4 gap-1.5">
          <History className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Activity
        </TabsTrigger>
        <TabsTrigger value="economics" className="text-xs sm:text-sm px-3 sm:px-4 gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Economics &amp; pricing
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="mt-0 focus-visible:outline-none">
        <BookingTripDetailsTab
          extras={extras}
          payments={payments}
          extrasError={!extras}
          scheduledAt={scheduledAt}
          returnScheduledAt={returnScheduledAt}
        />
      </TabsContent>

      <TabsContent value="activity" className="mt-0 focus-visible:outline-none">
        <BookingActivityPanel bookingId={bookingId} refreshKey={activityRefreshKey} />
      </TabsContent>

      <TabsContent value="economics" className="mt-0 focus-visible:outline-none">
        <BookingEconomicsPanel data={economics} loading={false} error={economicsError} />
      </TabsContent>
    </Tabs>
  );
}
