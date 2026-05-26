"use client";

import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import {
  PAYOUT_TIER_GROUP_LABELS,
  VEHICLE_CATEGORY_LABELS,
  VEHICLE_CATEGORY_OPTIONS,
  filterTiersByGroupAndCategory,
  type PayoutTierGroup,
  type VehicleCategoryId,
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
        <h4 className="text-xs font-semibold text-foreground">{PAYOUT_TIER_GROUP_LABELS[group]}</h4>
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
  creatingTierKey,
  PricingTable,
}: {
  tierRows: Row[];
  vehicleRateRows: Row[];
  tierCols: ColDef[];
  vatRatePercent: number;
  onSave: PricingTableProps["onSave"];
  onCreateTier: (category: VehicleCategoryId, group: PayoutTierGroup) => Promise<void>;
  creatingTierKey: string | null;
  PricingTable: ComponentType<PricingTableProps>;
}) {
  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground">
        Each vehicle category has its own trip and duration tier schedules. Min/Max hours on a tier
        mean hours before the job starts (urgency), not hours of driving. Driver payout rounds up
        to the nearest £1 in the driver app.
      </p>

      {VEHICLE_CATEGORY_OPTIONS.map((category) => (
        <section key={category} className="space-y-4 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold capitalize text-foreground">
            {VEHICLE_CATEGORY_LABELS[category]}
          </h3>

          <TierSection
            group="trip"
            rows={filterTiersByGroupAndCategory(tierRows, "trip", category)}
            cols={tierCols}
            table="payout_escalation_tiers"
            onSave={onSave}
            onCreate={() => onCreateTier(category, "trip")}
            creating={creatingTierKey === `${category}:trip`}
            vatRatePercent={vatRatePercent}
            PricingTable={PricingTable}
          />

          <TierSection
            group="duration"
            rows={filterTiersByGroupAndCategory(tierRows, "duration", category)}
            cols={tierCols}
            table="payout_escalation_tiers"
            onSave={onSave}
            onCreate={() => onCreateTier(category, "duration")}
            creating={creatingTierKey === `${category}:duration`}
            vatRatePercent={vatRatePercent}
            PricingTable={PricingTable}
          />
        </section>
      ))}

      <DriverTierDurationPreview
        tierRows={tierRows as TierRow[]}
        vehicleRates={vehicleRateRows as VehicleRateRow[]}
        vatRatePercent={vatRatePercent}
      />
    </div>
  );
}
