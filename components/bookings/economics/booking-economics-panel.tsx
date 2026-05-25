"use client";

import { BookingEconomicsOverview } from "./booking-economics-overview";
import { BookingEconomicsPricingBreakdown } from "./booking-economics-pricing-breakdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BookingEconomicsResponse } from "@/lib/bookings/economics/types";
import { Calculator, TrendingUp } from "lucide-react";

type BookingEconomicsPanelProps = {
  data: BookingEconomicsResponse | null;
  loading: boolean;
  error: string | null;
};

export function BookingEconomicsPanel({ data, loading, error }: BookingEconomicsPanelProps) {
  if (loading) {
    return (
      <div
        className="h-32 bg-muted/20 animate-pulse rounded-lg"
        aria-label="Loading booking economics"
      />
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
        <span className="font-medium text-xs sm:text-sm text-muted-foreground">
          Economics &amp; pricing
        </span>
        <span className="text-[10px] text-muted-foreground">(read-only)</span>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="h-auto min-h-10 w-full sm:w-auto flex-wrap gap-1 border-b border-border bg-transparent p-0">
          <TabsTrigger value="overview" className="text-xs sm:text-sm px-3 sm:px-4">
            Summary
          </TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs sm:text-sm px-3 sm:px-4 gap-1.5">
            <Calculator className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Pricing engine
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 focus-visible:outline-none">
          <BookingEconomicsOverview data={data} />
        </TabsContent>

        <TabsContent value="pricing" className="mt-4 focus-visible:outline-none">
          <BookingEconomicsPricingBreakdown breakdown={data.pricingEngine} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
