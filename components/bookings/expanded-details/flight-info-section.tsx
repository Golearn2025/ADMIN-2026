"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plane, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlightStatusResult } from "@/lib/flights/aerodatabox";

interface FlightInfoSectionProps {
  pickupFlightNumber?: string | null;
  returnFlightNumber?: string | null;
  /** Booking main pickup time — used as London date for arrival lookup */
  scheduledAt?: string | null;
  returnScheduledAt?: string | null;
}

type FlightCheckState = {
  loading: boolean;
  error: string | null;
  checkedAt: string | null;
  result: FlightStatusResult | null;
  found: boolean;
};

const idle: FlightCheckState = {
  loading: false,
  error: null,
  checkedAt: null,
  result: null,
  found: false,
};

function formatUkClock(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function humanStatus(result: FlightStatusResult): string {
  const raw = (result.status || "").toLowerCase();
  if (raw.includes("landed") || result.arrival?.actualAt) return "Landed";
  if (raw.includes("cancel")) return "Cancelled";
  if (raw.includes("divert")) return "Diverted";
  if (result.delayMinutes != null && result.delayMinutes >= 15) {
    return `Delayed ${result.delayMinutes} min`;
  }
  if (raw.includes("active") || raw.includes("enroute") || raw.includes("airborne")) {
    return "En route";
  }
  if (raw.includes("scheduled") || raw.includes("expected")) return "Scheduled";
  return result.status || "Status unknown";
}

function arrivalLine(result: FlightStatusResult): string {
  const ep = result.arrival;
  if (!ep) return "—";
  const when =
    formatUkClock(ep.actualAt) ||
    formatUkClock(ep.estimatedAt) ||
    formatUkClock(ep.scheduledAt);
  const label = ep.actualAt ? "Landed" : ep.estimatedAt ? "ETA" : "Scheduled";
  const term = ep.terminal ? ` · T${ep.terminal.replace(/^T/i, "")}` : "";
  const iata = ep.iata ? ` ${ep.iata}` : "";
  return `${label} ${when || "—"}${iata}${term}`;
}

function FlightStatusCard({
  label,
  flightNumber,
  scheduledAt,
}: {
  label: string;
  flightNumber: string;
  scheduledAt?: string | null;
}) {
  const [state, setState] = useState<FlightCheckState>(idle);
  const checkedOnce = useRef(false);

  const runCheck = useCallback(async () => {
    if (!scheduledAt) {
      setState({
        loading: false,
        error: "Trip date missing — cannot check arrival",
        checkedAt: null,
        result: null,
        found: false,
      });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/admin/flights/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightNumber,
          scheduledAt,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Lookup failed");
      }
      setState({
        loading: false,
        error: null,
        checkedAt: data.checkedAt || new Date().toISOString(),
        result: data.result || null,
        found: Boolean(data.found),
      });
    } catch (err) {
      setState({
        loading: false,
        error: err instanceof Error ? err.message : "Lookup failed",
        checkedAt: null,
        result: null,
        found: false,
      });
    }
  }, [flightNumber, scheduledAt]);

  // One automatic check when the section mounts — then only Refresh.
  useEffect(() => {
    if (checkedOnce.current) return;
    checkedOnce.current = true;
    void runCheck();
  }, [runCheck]);

  return (
    <div className="rounded-md border border-border/60 bg-muted/10 p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
          <span className="font-mono text-xs font-semibold truncate">{flightNumber}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] shrink-0"
          onClick={() => void runCheck()}
          disabled={state.loading}
        >
          {state.loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="ml-1">Refresh</span>
        </Button>
      </div>

      {state.loading && !state.result && !state.error && (
        <p className="text-[11px] text-muted-foreground">Checking arrival…</p>
      )}

      {state.error && (
        <p className="text-[11px] text-destructive">{state.error}</p>
      )}

      {!state.loading && !state.error && state.found && state.result && (
        <div className="space-y-0.5 text-[11px]">
          <p>
            <span className="text-muted-foreground">Status: </span>
            <span className="font-medium">{humanStatus(state.result)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Arrival: </span>
            <span className="font-medium">{arrivalLine(state.result)}</span>
          </p>
          {state.result.airlineName && (
            <p className="text-muted-foreground">{state.result.airlineName}</p>
          )}
          {state.checkedAt && (
            <p className="text-muted-foreground/80">
              Checked {formatUkClock(state.checkedAt)} UK
            </p>
          )}
        </div>
      )}

      {!state.loading && !state.error && !state.found && (
        <p className="text-[11px] text-muted-foreground italic">
          No live status for this flight/date.
        </p>
      )}
    </div>
  );
}

export function FlightInfoSection({
  pickupFlightNumber,
  returnFlightNumber,
  scheduledAt,
  returnScheduledAt,
}: FlightInfoSectionProps) {
  const hasFlightInfo = pickupFlightNumber || returnFlightNumber;

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <Plane className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium text-xs text-muted-foreground">Flight Info</span>
      </div>
      {!hasFlightInfo ? (
        <p className="text-xs text-muted-foreground italic">None</p>
      ) : (
        <div className="space-y-2">
          {pickupFlightNumber?.trim() && (
            <FlightStatusCard
              label="Pickup"
              flightNumber={pickupFlightNumber.trim()}
              scheduledAt={scheduledAt}
            />
          )}
          {returnFlightNumber?.trim() && (
            <FlightStatusCard
              label="Return"
              flightNumber={returnFlightNumber.trim()}
              scheduledAt={returnScheduledAt || scheduledAt}
            />
          )}
        </div>
      )}
    </div>
  );
}
