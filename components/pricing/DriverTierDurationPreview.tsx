"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  VEHICLE_CATEGORY_OPTIONS,
  type VehicleCategoryId,
} from "@/components/pricing/payoutTierGroups";
import {
  activeTiersForGroup,
  clientNetForDurationBooking,
  driverPayoutFromClientNet,
  findActiveVehicleRate,
  type TierRow,
  type VehicleRateRow,
} from "@/components/pricing/driverTierPreview";
import {
  computeVatPreviewFromNetPounds,
  formatPenceGBP,
} from "@/components/pricing/pricingVatPreview";

type Mode = "hourly" | "daily";

export function DriverTierDurationPreview({
  tierRows,
  vehicleRates,
  vatRatePercent,
}: {
  tierRows: TierRow[];
  vehicleRates: VehicleRateRow[];
  vatRatePercent: number;
}) {
  const [category, setCategory] = useState<VehicleCategoryId>("executive");
  const [mode, setMode] = useState<Mode>("hourly");
  const [units, setUnits] = useState("3");

  const durationTiers = useMemo(
    () => activeTiersForGroup(tierRows, "duration"),
    [tierRows]
  );

  const preview = useMemo(() => {
    const unitCount = Math.max(1, parseInt(units, 10) || 1);
    const rateRow = findActiveVehicleRate(vehicleRates, category, mode);
    if (!rateRow) return null;

    const ratePence =
      mode === "hourly"
        ? Number(rateRow.hourly_rate_pence) || 0
        : Number(rateRow.daily_rate_pence) || 0;
    const minFare = Number(rateRow.minimum_fare_pence) || 0;
    const clientNetPence = clientNetForDurationBooking(ratePence, unitCount, minFare);
    const clientNetPounds = clientNetPence / 100;
    const vatPreview = computeVatPreviewFromNetPounds(clientNetPounds, vatRatePercent);

    const driverLines = durationTiers.map((t) => {
      const factor = Number(t.driver_payout_factor) || 0;
      const totalPence = driverPayoutFromClientNet(clientNetPence, factor);
      const perHourPence = unitCount > 0 ? Math.round(totalPence / unitCount) : 0;
      return {
        label: String(t.label ?? "Tier"),
        factor,
        totalPence,
        perUnitPence: perHourPence,
      };
    });

    return {
      ratePence,
      minFare,
      unitCount,
      clientNetPence,
      vatPreview,
      driverLines,
      unitLabel: mode === "hourly" ? "hours" : "days",
    };
  }, [category, mode, units, vehicleRates, durationTiers, vatRatePercent]);

  if (!preview) {
    return (
      <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border p-3">
        No active {mode} rate for <span className="font-medium">{category}</span> in Vehicle Rates.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          Preview — Tier 2 (duration)
        </Badge>
        <span className="text-xs text-muted-foreground">
          Client = rate × {preview.unitLabel} (min fare if set). Driver = tier % × client NET.
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <span className="text-[10px] uppercase text-muted-foreground font-medium">Category</span>
          <Select value={category} onValueChange={(v) => setCategory(v as VehicleCategoryId)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VEHICLE_CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c} className="text-xs capitalize">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] uppercase text-muted-foreground font-medium">Mode</span>
          <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly" className="text-xs">
                Hourly
              </SelectItem>
              <SelectItem value="daily" className="text-xs">
                Daily
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] uppercase text-muted-foreground font-medium">
            {preview.unitLabel}
          </span>
          <Input
            className="h-8 w-20 text-xs"
            type="number"
            min={1}
            value={units}
            onChange={(e) => setUnits(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border/60 bg-background/50 p-3 text-xs space-y-1">
          <p className="font-semibold text-foreground">Client (website)</p>
          <p>
            Rate NET: <span className="font-mono">{formatPenceGBP(preview.ratePence)}</span> /{" "}
            {mode === "hourly" ? "hour" : "day"}
          </p>
          <p>
            Trip NET ({preview.unitCount} {preview.unitLabel}):{" "}
            <span className="font-mono">{formatPenceGBP(preview.clientNetPence)}</span>
          </p>
          {preview.minFare > 0 && (
            <p className="text-muted-foreground">
              Min fare in rates: {formatPenceGBP(preview.minFare)} (applied if rate × units is lower)
            </p>
          )}
          {preview.vatPreview && vatRatePercent > 0 && (
            <>
              <p className="text-muted-foreground">
                VAT ({vatRatePercent}%): {formatPenceGBP(preview.vatPreview.vatPence)}
              </p>
              <p className="font-medium text-primary">
                FINAL WEBSITE PRICE: {formatPenceGBP(preview.vatPreview.grossPence)} incl. VAT
              </p>
            </>
          )}
        </div>

        <div className="rounded-md border border-border/60 bg-background/50 p-3 text-xs space-y-2">
          <p className="font-semibold text-foreground">Driver app (duration tiers)</p>
          {preview.driverLines.length === 0 ? (
            <p className="text-muted-foreground">No active duration tiers configured.</p>
          ) : (
            preview.driverLines.map((line) => (
              <div key={line.label} className="border-t border-border/40 pt-2 first:border-0 first:pt-0">
                <p className="font-medium">{line.label}</p>
                <p>
                  Factor {(line.factor * 100).toFixed(0)}% → total{" "}
                  <span className="font-mono">{formatPenceGBP(line.totalPence)}</span>
                </p>
                <p className="text-muted-foreground">
                  ≈ <span className="font-mono">{formatPenceGBP(line.perUnitPence)}</span> /{" "}
                  {preview.unitLabel.slice(0, -1) || "unit"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
