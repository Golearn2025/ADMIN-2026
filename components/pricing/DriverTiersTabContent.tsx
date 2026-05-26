"use client";

import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import {
  PAYOUT_TIER_GROUP_LABELS,
  filterTiersByGroup,
  type PayoutTierGroup,
} from "@/components/pricing/payoutTierGroups";
import { DriverTierDurationPreview } from "@/components/pricing/DriverTierDurationPreview";
import type { ColDef } from "@/components/pricing/pricingAdminColumns";
import type { TierRow, VehicleRateRow } from "@/components/pricing/driverTierPreview";

type Row = Record<string, unknown>;

type PricingTableProps = {
  table: string;
  rows: Row[];
  cols: ColDef[];
  onSave: (table: string, id: string, updates: Row) => Promise<void>;
  onCreate?: () => Promise<void>;
  creating?: boolean;
  vatRatePercent?: number;
};

function TierSection({
  group,
  rows,
  cols,
  table,
  onSave,
  onCreate,
  creating,
  vatRatePercent,
  PricingTable,
}: {
  group: PayoutTierGroup;
  rows: Row[];
  cols: ColDef[];
  table: string;
  onSave: PricingTableProps["onSave"];
  onCreate?: () => Promise<void>;
  creating?: boolean;
  vatRatePercent: number;
  PricingTable: ComponentType<PricingTableProps>;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{PAYOUT_TIER_GROUP_LABELS[group]}</h3>
        {onCreate && (
          <Button size="sm" variant="outline" className="h-8" disabled={creating} onClick={onCreate}>
            {creating ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5 mr-1.5" />
            )}
            Add tier
          </Button>
        )}
      </div>
      <PricingTable
        table={table}
        rows={rows}
        cols={cols}
        onSave={onSave}
        vatRatePercent={vatRatePercent}
      />
    </section>
  );
}

export function DriverTiersTabContent({
  tierRows,
  vehicleRateRows,
  tierCols,
  vatRatePercent,
  onSave,
  onCreateTier,
  creatingGroup,
  PricingTable,
}: {
  tierRows: Row[];
  vehicleRateRows: Row[];
  tierCols: ColDef[];
  vatRatePercent: number;
  onSave: PricingTableProps["onSave"];
  onCreateTier: (group: PayoutTierGroup) => Promise<void>;
  creatingGroup: PayoutTierGroup | null;
  PricingTable: ComponentType<PricingTableProps>;
}) {
  const tripRows = filterTiersByGroup(tierRows, "trip");
  const durationRows = filterTiersByGroup(tierRows, "duration");

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Two independent tier schedules. Trip applies to one-way, return, and fleet assembly. Duration
        applies to hourly, daily, and fleet booked by hours/days. Driver payout rounds up to the
        nearest £1 in the driver app.
      </p>

      <TierSection
        group="trip"
        rows={tripRows}
        cols={tierCols}
        table="payout_escalation_tiers"
        onSave={onSave}
        onCreate={() => onCreateTier("trip")}
        creating={creatingGroup === "trip"}
        vatRatePercent={vatRatePercent}
        PricingTable={PricingTable}
      />

      <TierSection
        group="duration"
        rows={durationRows}
        cols={tierCols}
        table="payout_escalation_tiers"
        onSave={onSave}
        onCreate={() => onCreateTier("duration")}
        creating={creatingGroup === "duration"}
        vatRatePercent={vatRatePercent}
        PricingTable={PricingTable}
      />

      <DriverTierDurationPreview
        tierRows={tierRows as TierRow[]}
        vehicleRates={vehicleRateRows as VehicleRateRow[]}
        vatRatePercent={vatRatePercent}
      />
    </div>
  );
}
