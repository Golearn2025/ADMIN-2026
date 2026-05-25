"use client";

import { BookingEconomicsPanel } from "@/components/bookings/economics";
import { BookingTripDetailsTab } from "@/components/bookings/expanded-details/booking-trip-details-tab";
import type { BookingExtras, BookingPayment } from "@/components/bookings/expanded-details/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BookingEconomicsResponse } from "@/lib/bookings/economics/types";
import { ClipboardList, TrendingUp } from "lucide-react";

type BookingExpandedTabsProps = {
  extras: BookingExtras | null;
  payments: BookingPayment[];
  economics: BookingEconomicsResponse | null;
  economicsError: string | null;
  isLoadingDetails: boolean;
};

export function BookingExpandedTabs({
  extras,
  payments,
  economics,
  economicsError,
  isLoadingDetails,
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
        />
      </TabsContent>

      <TabsContent value="economics" className="mt-0 focus-visible:outline-none">
        <BookingEconomicsPanel data={economics} loading={false} error={economicsError} />
      </TabsContent>
    </Tabs>
  );
}
