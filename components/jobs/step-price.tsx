"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { PriceForm } from "@/hooks/use-new-job";
import { cn } from "@/lib/utils";

interface StepPriceProps {
  value: PriceForm;
  onChange: (v: PriceForm) => void;
  onFetchQuote: () => Promise<void>;
  quoteLoading: boolean;
  quoteError: string | null;
  onNext: () => void;
  onPrev: () => void;
}

type CommissionSettings = {
  platformPct: number; // 0–100 display, e.g. 30
  operatorPct: number;
};

/** VL default commissions — used until org settings load (or if GET is forbidden). */
const DEFAULT_COMMISSION: CommissionSettings = {
  platformPct: 30,
  operatorPct: 10,
};

function fmt(n: unknown) {
  if (n == null || n === "") return "—";
  const num = typeof n === "number" ? n : typeof n === "string" ? Number(n) : NaN;
  if (!Number.isFinite(num)) return "—";
  return `£${num.toFixed(2)}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const BREAKDOWN_ORDER = [
  "baseFare",
  "distanceFee",
  "timeFee",
  "airportFees",
  "zoneFees",
  "tollFees",
  "multiStopFees",
  "waitingFees",
  "serviceItemFees",
  "subtotal",
  "finalPrice",
] as const;

function breakdownRows(
  breakdown: Record<string, unknown>,
  extras?: { priceBeforeVAT?: number | null; vatAmount?: number | null; vatRate?: number | null }
): Array<{ key: string; value: string }> {
  const rows: Array<{ key: string; value: string }> = [];
  const seen = new Set<string>();

  for (const key of BREAKDOWN_ORDER) {
    const raw = breakdown[key];
    if (raw == null || typeof raw === "object") continue;
    const num = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(num)) continue;
    rows.push({ key, value: fmt(num) });
    seen.add(key);
  }

  for (const [key, raw] of Object.entries(breakdown)) {
    if (seen.has(key) || raw == null || typeof raw === "object") continue;
    const num = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(num)) continue;
    rows.push({ key, value: fmt(num) });
  }

  if (extras?.priceBeforeVAT != null) {
    rows.push({ key: "priceBeforeVAT (net)", value: fmt(extras.priceBeforeVAT) });
  }
  if (extras?.vatAmount != null) {
    const rate =
      extras.vatRate != null && Number.isFinite(extras.vatRate)
        ? ` VAT ${Math.round(extras.vatRate * 100)}%`
        : " VAT";
    rows.push({ key: `vatAmount (${rate.trim()})`, value: fmt(extras.vatAmount) });
  }

  return rows;
}

function formatLegLine(leg: {
  legNumber: number;
  distance: number | null;
  duration: number | null;
}) {
  const miles =
    leg.distance == null || !Number.isFinite(leg.distance)
      ? "—"
      : `${leg.distance.toFixed(1)} mi`;
  const mins =
    leg.duration == null || !Number.isFinite(leg.duration)
      ? "—"
      : `${Math.round(leg.duration)} min`;
  return `Leg ${leg.legNumber}: ${miles} · ${mins}`;
}

/** Split net client price using org commission settings (same model as pricing commissions). */
function estimateSplit(
  net: number,
  settings: CommissionSettings
): {
  platformFee: number;
  operatorFee: number;
  driverEstimate: number;
  companyKeep: number;
} {
  const platformRate = settings.platformPct / 100;
  const operatorRate = settings.operatorPct / 100;
  const platformFee = round2(net * platformRate);
  const afterPlatform = round2(net - platformFee);
  const operatorFee = round2(afterPlatform * operatorRate);
  const driverEstimate = round2(afterPlatform - operatorFee);
  return {
    platformFee,
    operatorFee,
    driverEstimate,
    companyKeep: round2(platformFee + operatorFee),
  };
}

export function StepPrice({
  value,
  onChange,
  onFetchQuote,
  quoteLoading,
  quoteError,
  onNext,
  onPrev,
}: StepPriceProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [manualMode, setManualMode] = useState(value.priceOverride != null);
  const [driverMode, setDriverMode] = useState(value.driverPayout != null);
  const [commission, setCommission] = useState<CommissionSettings>(DEFAULT_COMMISSION);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/organization-settings");
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const platformPct = Number(data.platform_commission_percent);
        const operatorPct = Number(data.operator_commission_percent);
        if (!Number.isFinite(platformPct) || !Number.isFinite(operatorPct)) return;
        setCommission({ platformPct, operatorPct });
      } catch {
        // Keep DEFAULT_COMMISSION so Driver + Profit always show after quote
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayPrice = value.priceOverride ?? value.quotedPrice;
  const canProceed = displayPrice != null && displayPrice > 0;

  const netForSplit = useMemo(() => {
    if (value.priceBeforeVAT != null && Number.isFinite(value.priceBeforeVAT)) {
      return value.priceBeforeVAT;
    }
    // If admin overrode gross client price, back out VAT when rate known
    if (value.priceOverride != null && value.vatRate != null && value.vatRate > 0) {
      return round2(value.priceOverride / (1 + value.vatRate));
    }
    if (value.quotedPrice != null && value.vatAmount != null) {
      return round2(value.quotedPrice - value.vatAmount);
    }
    // Last resort: treat quoted/display as already net (no VAT fields)
    if (displayPrice != null && Number.isFinite(displayPrice) && displayPrice > 0) {
      return displayPrice;
    }
    return null;
  }, [
    value.priceBeforeVAT,
    value.priceOverride,
    value.vatRate,
    value.quotedPrice,
    value.vatAmount,
    displayPrice,
  ]);

  const split = useMemo(() => {
    if (netForSplit == null || netForSplit <= 0) return null;
    return estimateSplit(netForSplit, commission);
  }, [netForSplit, commission]);

  const usingOverride = value.driverPayout != null;
  const driverWillSee = value.driverPayout ?? split?.driverEstimate ?? null;
  const profit =
    netForSplit != null && driverWillSee != null
      ? round2(netForSplit - driverWillSee)
      : split?.companyKeep ?? null;

  function handleOverride(v: string) {
    const n = parseFloat(v);
    onChange({ ...value, priceOverride: isNaN(n) ? null : n });
  }

  function handleDriverPayout(v: string) {
    const n = parseFloat(v);
    onChange({ ...value, driverPayout: isNaN(n) ? null : n });
  }

  return (
    <div className="space-y-5">
      {/* Quote button */}
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Price from pricing engine</p>
            <Button
              size="sm"
              variant="outline"
              disabled={quoteLoading}
              onClick={onFetchQuote}
              className="gap-1.5"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", quoteLoading && "animate-spin")} />
              {quoteLoading ? "Calculating..." : value.quoteId ? "Recalculate" : "Calculate"}
            </Button>
          </div>

          {quoteError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {quoteError}
            </div>
          )}

          {value.quotedPrice != null && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">{fmt(value.quotedPrice)}</span>
                <span className="text-xs text-muted-foreground">{value.currency}</span>
              </div>
              {(value.priceBeforeVAT != null || value.vatAmount != null) && (
                <p className="text-[11px] text-muted-foreground">
                  {value.priceBeforeVAT != null ? `Net ${fmt(value.priceBeforeVAT)}` : null}
                  {value.priceBeforeVAT != null && value.vatAmount != null ? " + " : null}
                  {value.vatAmount != null
                    ? `VAT ${fmt(value.vatAmount)}${
                        value.vatRate != null ? ` (${Math.round(value.vatRate * 100)}%)` : ""
                      }`
                    : null}
                  {" → "}client total {fmt(value.quotedPrice)}
                </p>
              )}

              {(value.breakdown || value.vatAmount != null) && (
                <button
                  type="button"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Breakdown details
                </button>
              )}

              {showBreakdown && (value.breakdown || value.vatAmount != null) && (
                <div className="rounded-lg bg-muted p-3 space-y-1 text-xs">
                  {breakdownRows((value.breakdown ?? {}) as Record<string, unknown>, {
                    priceBeforeVAT: value.priceBeforeVAT,
                    vatAmount: value.vatAmount,
                    vatRate: value.vatRate,
                  }).map(({ key, value: amount }) => (
                    <div key={key} className="flex justify-between gap-3">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="font-medium shrink-0">{amount}</span>
                    </div>
                  ))}
                </div>
              )}

              {value.legDetails &&
                value.legDetails.some((l) => l.distance != null || l.duration != null) && (
                <div className="space-y-1 pt-1">
                  {value.legDetails
                    .filter((l) => l.distance != null || l.duration != null)
                    .map((leg) => (
                      <div key={leg.legNumber} className="text-xs text-muted-foreground">
                        {formatLegLine(leg)}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Driver + Profit — visible right after Calculate, before Telegram/send */}
      {split && netForSplit != null && displayPrice != null && (
        <Card className="overflow-hidden border-2 border-primary/30 bg-gradient-to-b from-primary/5 to-background shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-primary/15 px-4 py-3">
              <p className="text-sm font-semibold tracking-tight">Driver &amp; profit</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Before you send · net {fmt(netForSplit)} · commissions{" "}
                {commission.platformPct}% / {commission.operatorPct}%
              </p>
            </div>

            <div className="grid grid-cols-2 gap-px bg-border/60">
              <div className="bg-background px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Driver price
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400">
                  {fmt(driverWillSee)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {usingOverride ? "Locked override" : "Estimated payout"}
                </p>
              </div>
              <div className="bg-background px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Profit
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-primary">
                  {fmt(profit)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Net − driver (ex VAT)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-px border-t border-border/60 bg-border/40 text-center">
              <div className="bg-muted/40 px-2 py-2.5">
                <p className="text-[10px] uppercase text-muted-foreground">Client</p>
                <p className="text-sm font-semibold tabular-nums">{fmt(displayPrice)}</p>
              </div>
              <div className="bg-muted/40 px-2 py-2.5">
                <p className="text-[10px] uppercase text-muted-foreground">
                  Platform {commission.platformPct}%
                </p>
                <p className="text-sm font-semibold tabular-nums">{fmt(split.platformFee)}</p>
              </div>
              <div className="bg-muted/40 px-2 py-2.5">
                <p className="text-[10px] uppercase text-muted-foreground">
                  Operator {commission.operatorPct}%
                </p>
                <p className="text-sm font-semibold tabular-nums">{fmt(split.operatorFee)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual price override */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="manual-price"
            checked={manualMode}
            onChange={(e) => {
              setManualMode(e.target.checked);
              if (!e.target.checked) onChange({ ...value, priceOverride: null });
            }}
            className="rounded"
          />
          <Label htmlFor="manual-price" className="cursor-pointer text-sm">
            Manual price override
          </Label>
        </div>

        {manualMode && (
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={value.priceOverride ?? ""}
              onChange={(e) => handleOverride(e.target.value)}
              className="pl-7"
            />
          </div>
        )}

        {manualMode && value.priceOverride != null && value.quotedPrice != null && (
          <p className="text-xs text-amber-600 mt-1">
            Engine price: {fmt(value.quotedPrice)} → Override: {fmt(value.priceOverride)}
          </p>
        )}
      </div>

      {/* Driver payout override */}
      <div className="border border-border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="driver-payout"
            checked={driverMode}
            onChange={(e) => {
              setDriverMode(e.target.checked);
              if (!e.target.checked) onChange({ ...value, driverPayout: null });
            }}
            className="rounded"
          />
          <Label htmlFor="driver-payout" className="cursor-pointer text-sm font-medium">
            Set driver payout manually
          </Label>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Locks what the driver sees in the app. Leave off to let rate cards apply later — the estimate
          above is from org commissions only.
          {split ? ` Suggested: ${fmt(split.driverEstimate)}.` : null}
        </p>

        {driverMode && (
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder={split ? String(split.driverEstimate) : "0.00"}
              value={value.driverPayout ?? ""}
              onChange={(e) => handleDriverPayout(e.target.value)}
              className="pl-7"
            />
          </div>
        )}

        {driverMode && value.driverPayout != null && (
          <p className="text-xs text-blue-600">
            Driver will see: {fmt(value.driverPayout)}
            {split ? ` · estimate was ${fmt(split.driverEstimate)}` : null}
          </p>
        )}

        {!driverMode && split && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={() => {
              setDriverMode(true);
              onChange({ ...value, driverPayout: split.driverEstimate });
            }}
          >
            Use estimate {fmt(split.driverEstimate)} as override
          </Button>
        )}
      </div>

      {/* Summary */}
      {displayPrice != null && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Amount to charge</span>
              <span className="text-xl font-bold text-primary">{fmt(displayPrice)}</span>
            </div>
            {driverWillSee != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Driver {usingOverride ? "(locked)" : "(estimate)"}
                </span>
                <span className="font-medium tabular-nums">{fmt(driverWillSee)}</span>
              </div>
            )}
            {manualMode && value.priceOverride != null && (
              <p className="text-xs text-muted-foreground">Manual client price override active</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onPrev}>
          ← Back
        </Button>
        <Button className="flex-1" disabled={!canProceed} onClick={onNext}>
          Continue →
        </Button>
      </div>
    </div>
  );
}
