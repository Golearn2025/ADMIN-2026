"use client";

import { useState } from "react";
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

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return `£${n.toFixed(2)}`;
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

  const displayPrice = value.priceOverride ?? value.quotedPrice;
  const canProceed = displayPrice != null && displayPrice > 0;

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
            <p className="text-sm font-medium">Preț calculat de engine</p>
            <Button
              size="sm"
              variant="outline"
              disabled={quoteLoading}
              onClick={onFetchQuote}
              className="gap-1.5"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", quoteLoading && "animate-spin")} />
              {quoteLoading ? "Calculez..." : value.quoteId ? "Recalculez" : "Calculează"}
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

              {value.breakdown && (
                <button
                  type="button"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Detalii breakdown
                </button>
              )}

              {showBreakdown && value.breakdown && (
                <div className="rounded-lg bg-muted p-3 space-y-1 text-xs">
                  {Object.entries(value.breakdown).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="font-medium">{fmt(v as number)}</span>
                    </div>
                  ))}
                </div>
              )}

              {value.legDetails && value.legDetails.length > 0 && (
                <div className="space-y-1 pt-1">
                  {value.legDetails.map((leg) => (
                    <div key={leg.legNumber} className="text-xs text-muted-foreground">
                      Leg {leg.legNumber}: {leg.distance.toFixed(1)} mi · {leg.duration} min
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
            Override manual de preț
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
            Prețul engine: {fmt(value.quotedPrice)} → Override: {fmt(value.priceOverride)}
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
            Setează prețul șoferului manual
          </Label>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Cât vede șoferul în app (driver payout). Dacă nu setezi, se calculează automat din rate cards.
        </p>

        {driverMode && (
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={value.driverPayout ?? ""}
              onChange={(e) => handleDriverPayout(e.target.value)}
              className="pl-7"
            />
          </div>
        )}

        {driverMode && value.driverPayout != null && (
          <p className="text-xs text-blue-600">
            Șoferul va vedea: {fmt(value.driverPayout)}
          </p>
        )}
      </div>

      {/* Summary */}
      {displayPrice != null && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total de facturat</span>
              <span className="text-xl font-bold text-primary">{fmt(displayPrice)}</span>
            </div>
            {manualMode && value.priceOverride != null && (
              <p className="text-xs text-muted-foreground mt-1">Override manual activ</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onPrev}>← Înapoi</Button>
        <Button className="flex-1" disabled={!canProceed} onClick={onNext}>Continuă →</Button>
      </div>
    </div>
  );
}
