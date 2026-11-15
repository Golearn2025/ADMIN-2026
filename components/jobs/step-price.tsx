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
  platformPct: number;
  operatorPct: number;
};

const DEFAULT_COMMISSION: CommissionSettings = {
  platformPct: 30,
  operatorPct: 10,
};

const BREAKDOWN_LABELS: Record<string, string> = {
  baseFare: "Base fare",
  distanceFee: "Distance",
  timeFee: "Time",
  airportFees: "Airport fees",
  zoneFees: "Zone / congestion",
  tollFees: "Tolls",
  multiStopFees: "Multi-stop",
  waitingFees: "Waiting",
  serviceItemFees: "Extras / services",
  subtotal: "Subtotal",
  finalPrice: "Engine total (ex VAT)",
  discounts: "Discounts",
};

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

function fmt(n: unknown) {
  if (n == null || n === "") return "—";
  const num = typeof n === "number" ? n : typeof n === "string" ? Number(n) : NaN;
  if (!Number.isFinite(num)) return "—";
  return `£${num.toFixed(2)}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function labelForKey(key: string) {
  if (BREAKDOWN_LABELS[key]) return BREAKDOWN_LABELS[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function fareRows(
  breakdown: Record<string, unknown> | null | undefined
): Array<{ key: string; label: string; amount: number; emphasis?: boolean }> {
  if (!breakdown) return [];
  const rows: Array<{ key: string; label: string; amount: number; emphasis?: boolean }> = [];
  const seen = new Set<string>();

  for (const key of BREAKDOWN_ORDER) {
    const raw = breakdown[key];
    if (raw == null || typeof raw === "object") continue;
    const num = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(num) || num === 0) continue;
    rows.push({
      key,
      label: labelForKey(key),
      amount: num,
      emphasis: key === "subtotal" || key === "finalPrice",
    });
    seen.add(key);
  }

  for (const [key, raw] of Object.entries(breakdown)) {
    if (seen.has(key) || raw == null || typeof raw === "object") continue;
    if (key === "multipliers" || key === "details" || key === "discounts") continue;
    const num = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(num) || num === 0) continue;
    rows.push({ key, label: labelForKey(key), amount: num });
  }

  return rows;
}

function estimateSplit(net: number, settings: CommissionSettings) {
  const platformFee = round2(net * (settings.platformPct / 100));
  const afterPlatform = round2(net - platformFee);
  const operatorFee = round2(afterPlatform * (settings.operatorPct / 100));
  const driverEstimate = round2(afterPlatform - operatorFee);
  return {
    platformFee,
    operatorFee,
    driverEstimate,
    companyKeep: round2(platformFee + operatorFee),
  };
}

function MoneyRow({
  label,
  amount,
  muted,
  strong,
}: {
  label: string;
  amount: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2.5",
        strong && "border-t border-border/70 pt-3 mt-1"
      )}
    >
      <span
        className={cn(
          "text-sm",
          muted ? "text-muted-foreground" : "text-foreground/80",
          strong && "font-medium text-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums shrink-0",
          strong ? "text-base font-semibold" : "text-sm font-medium"
        )}
      >
        {amount}
      </span>
    </div>
  );
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
  const [showBreakdown, setShowBreakdown] = useState(true);
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
        // keep defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayPrice = value.priceOverride ?? value.quotedPrice;
  const canProceed = displayPrice != null && displayPrice > 0;
  const rows = useMemo(() => fareRows(value.breakdown), [value.breakdown]);

  const netForSplit = useMemo(() => {
    if (value.priceBeforeVAT != null && Number.isFinite(value.priceBeforeVAT)) {
      return value.priceBeforeVAT;
    }
    if (value.priceOverride != null && value.vatRate != null && value.vatRate > 0) {
      return round2(value.priceOverride / (1 + value.vatRate));
    }
    if (value.quotedPrice != null && value.vatAmount != null) {
      return round2(value.quotedPrice - value.vatAmount);
    }
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

  const legs =
    value.legDetails?.filter((l) => l.distance != null || l.duration != null) ?? [];

  function handleOverride(v: string) {
    const n = parseFloat(v);
    onChange({ ...value, priceOverride: isNaN(n) ? null : n });
  }

  function handleDriverPayout(v: string) {
    const n = parseFloat(v);
    onChange({ ...value, driverPayout: isNaN(n) ? null : n });
  }

  return (
    <div className="space-y-6">
      {/* Calculate */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Quote</p>
          <p className="text-xs text-muted-foreground">From pricing engine · VAT included for client</p>
        </div>
        <Button
          size="sm"
          variant={value.quotedPrice != null ? "outline" : "default"}
          disabled={quoteLoading}
          onClick={onFetchQuote}
          className="gap-1.5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", quoteLoading && "animate-spin")} />
          {quoteLoading ? "Calculating…" : value.quoteId ? "Recalculate" : "Calculate"}
        </Button>
      </div>

      {quoteError && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {quoteError}
        </div>
      )}

      {value.quotedPrice != null && (
        <>
          {/* Client total */}
          <Card className="overflow-hidden border-border/80">
            <CardContent className="p-0">
              <div className="px-5 py-5 sm:px-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Client pays
                </p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <p className="text-4xl font-semibold tracking-tight text-primary tabular-nums">
                    {fmt(displayPrice)}
                  </p>
                  <span className="pb-1 text-xs text-muted-foreground">{value.currency}</span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-muted/50 px-3.5 py-3">
                    <p className="text-[11px] text-muted-foreground">Net</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {fmt(value.priceBeforeVAT ?? netForSplit)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-3.5 py-3">
                    <p className="text-[11px] text-muted-foreground">
                      VAT
                      {value.vatRate != null ? ` ${Math.round(value.vatRate * 100)}%` : ""}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">{fmt(value.vatAmount)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-3.5 py-3">
                    <p className="text-[11px] text-muted-foreground">Engine quote</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">{fmt(value.quotedPrice)}</p>
                  </div>
                </div>

                {legs.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {legs.map((leg) => (
                      <span
                        key={leg.legNumber}
                        className="inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground"
                      >
                        Leg {leg.legNumber}
                        <span className="mx-1.5 text-border">·</span>
                        {leg.distance != null ? `${leg.distance.toFixed(1)} mi` : "—"}
                        <span className="mx-1.5 text-border">·</span>
                        {leg.duration != null ? `${Math.round(leg.duration)} min` : "—"}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Fare breakdown */}
              {(rows.length > 0 || value.vatAmount != null) && (
                <div className="border-t border-border/70">
                  <button
                    type="button"
                    onClick={() => setShowBreakdown((v) => !v)}
                    className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm hover:bg-muted/30 sm:px-6"
                  >
                    <span className="font-medium">Fare breakdown</span>
                    {showBreakdown ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {showBreakdown && (
                    <div className="px-5 pb-5 sm:px-6">
                      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-1">
                        {rows.map((row) => (
                          <MoneyRow
                            key={row.key}
                            label={row.label}
                            amount={fmt(row.amount)}
                            muted={!row.emphasis}
                            strong={row.emphasis}
                          />
                        ))}
                        {value.priceBeforeVAT != null && (
                          <MoneyRow label="Net (before VAT)" amount={fmt(value.priceBeforeVAT)} strong />
                        )}
                        {value.vatAmount != null && (
                          <MoneyRow
                            label={`VAT${
                              value.vatRate != null ? ` ${Math.round(value.vatRate * 100)}%` : ""
                            }`}
                            amount={fmt(value.vatAmount)}
                          />
                        )}
                        <MoneyRow label="Client total" amount={fmt(value.quotedPrice)} strong />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Driver + Profit */}
          {split && netForSplit != null && (
            <section className="space-y-3">
              <div>
                <p className="text-sm font-medium">Before you send</p>
                <p className="text-xs text-muted-foreground">
                  Estimated from net {fmt(netForSplit)} · platform {commission.platformPct}% ·
                  operator {commission.operatorPct}%
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.06] to-background">
                  <CardContent className="px-5 py-5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Driver payout
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
                      {fmt(driverWillSee)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {usingOverride ? "Manual override locked for the app" : "Estimate · lock below if needed"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-primary/25 bg-gradient-to-b from-primary/[0.08] to-background">
                  <CardContent className="px-5 py-5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Estimated profit
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-primary">
                      {fmt(profit)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">Net − driver · excludes VAT</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border/60 px-3 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Client</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">{fmt(displayPrice)}</p>
                </div>
                <div className="rounded-xl border border-border/60 px-3 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Platform {commission.platformPct}%
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">{fmt(split.platformFee)}</p>
                </div>
                <div className="rounded-xl border border-border/60 px-3 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Operator {commission.operatorPct}%
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">{fmt(split.operatorFee)}</p>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Overrides */}
      <section className="space-y-3">
        <p className="text-sm font-medium">Overrides</p>

        <div className="rounded-xl border border-border/70 divide-y divide-border/60">
          <div className="px-4 py-3.5 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="manual-price"
                checked={manualMode}
                onChange={(e) => {
                  setManualMode(e.target.checked);
                  if (!e.target.checked) onChange({ ...value, priceOverride: null });
                }}
                className="mt-1 rounded"
              />
              <span>
                <span className="block text-sm font-medium">Manual client price</span>
                <span className="block text-xs text-muted-foreground">
                  Replace what the customer is charged
                </span>
              </span>
            </label>
            {manualMode && (
              <div className="relative ml-7 max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  £
                </span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={value.priceOverride ?? ""}
                  onChange={(e) => handleOverride(e.target.value)}
                  className="pl-7"
                />
                {value.priceOverride != null && value.quotedPrice != null && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    Engine {fmt(value.quotedPrice)} → override {fmt(value.priceOverride)}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="px-4 py-3.5 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="driver-payout"
                checked={driverMode}
                onChange={(e) => {
                  setDriverMode(e.target.checked);
                  if (!e.target.checked) onChange({ ...value, driverPayout: null });
                }}
                className="mt-1 rounded"
              />
              <span>
                <span className="block text-sm font-medium">Lock driver payout</span>
                <span className="block text-xs text-muted-foreground">
                  What the driver sees in the app
                  {split ? ` · suggest ${fmt(split.driverEstimate)}` : ""}
                </span>
              </span>
            </label>

            {driverMode && (
              <div className="relative ml-7 max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  £
                </span>
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

            {!driverMode && split && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="ml-7 h-8 text-xs"
                onClick={() => {
                  setDriverMode(true);
                  onChange({ ...value, driverPayout: split.driverEstimate });
                }}
              >
                Use estimate {fmt(split.driverEstimate)}
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="flex gap-3 pt-1">
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
