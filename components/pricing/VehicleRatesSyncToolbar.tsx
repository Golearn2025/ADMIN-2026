"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import {
  FLEET_SYNC_PAIRS,
  planAllFleetSyncs,
  planVehicleRateSync,
  RETURN_MIRROR_PAIR,
  type VehicleRateRow,
  type VehicleRateSyncPair,
} from "@/components/pricing/pricingVehicleRateSync";

type Props = {
  /** Latest rows from parent; refreshed via getVehicleRows before each operation. */
  getVehicleRows: () => VehicleRateRow[];
  onSyncPlans: (plans: Array<{ targetId: string; updates: Record<string, unknown> }>) => Promise<void>;
  showReturnMirror?: boolean;
};

async function runPairSync(
  pair: VehicleRateSyncPair,
  getVehicleRows: () => VehicleRateRow[],
  onSyncPlans: Props["onSyncPlans"]
): Promise<{ updated: number; skipped: number; label: string }> {
  const plans = planVehicleRateSync(
    getVehicleRows(),
    pair.sourceBookingType,
    pair.targetBookingType
  );
  if (plans.length === 0) {
    return { updated: 0, skipped: 0, label: pair.label };
  }
  const ok = window.confirm(
    `${pair.label}\n\nThis will update ${plans.length} vehicle rate row(s) for booking type "${pair.targetBookingType}".\n` +
      `Source: ${pair.sourceBookingType}. Organization and pricing version are matched per vehicle.\n\nContinue?`
  );
  if (!ok) return { updated: 0, skipped: plans.length, label: pair.label };

  await onSyncPlans(plans.map((p) => ({ targetId: p.targetId, updates: p.updates })));
  return { updated: plans.length, skipped: 0, label: pair.label };
}

export function VehicleRatesSyncToolbar({
  getVehicleRows,
  onSyncPlans,
  showReturnMirror = true,
}: Props) {
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const runningRef = useRef(false);

  const pairs = showReturnMirror ? [...FLEET_SYNC_PAIRS, RETURN_MIRROR_PAIR] : FLEET_SYNC_PAIRS;

  const handleSync = async (pair: VehicleRateSyncPair) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setSyncingId(pair.id);
    setLastMessage(null);
    try {
      const { updated, skipped, label } = await runPairSync(pair, getVehicleRows, onSyncPlans);
      if (updated > 0) {
        setLastMessage(`${label}: updated ${updated} row(s).`);
      } else if (skipped > 0) {
        setLastMessage(`${label}: cancelled.`);
      } else {
        setLastMessage(`${label}: already in sync (no changes).`);
      }
    } catch (e: unknown) {
      setLastMessage(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncingId(null);
      runningRef.current = false;
    }
  };

  const handleSyncAllFleet = async () => {
    if (runningRef.current) return;
    const rows = getVehicleRows();
    const plans = planAllFleetSyncs(rows);
    if (plans.length === 0) {
      setLastMessage("All fleet rates already match oneway / hourly / daily sources.");
      return;
    }

    const ok = window.confirm(
      `Sync all fleet rates\n\nThis runs 3 steps in one go:\n` +
        `• oneway → fleet\n• hourly → fleet_hourly\n• daily → fleet_daily\n\n` +
        `${plans.length} row update(s) total. Continue?`
    );
    if (!ok) return;

    runningRef.current = true;
    setSyncingId("sync-all-fleet");
    setLastMessage(null);
    try {
      await onSyncPlans(plans.map((p) => ({ targetId: p.targetId, updates: p.updates })));
      setLastMessage(
        `Sync all fleet: updated ${plans.length} row(s) (oneway→fleet, hourly→fleet_hourly, daily→fleet_daily).`
      );
    } catch (e: unknown) {
      setLastMessage(e instanceof Error ? e.message : "Sync all fleet failed");
    } finally {
      setSyncingId(null);
      runningRef.current = false;
    }
  };

  const busy = syncingId !== null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/15 px-4 py-3 space-y-2">
      <p className="text-xs font-semibold text-foreground">Fleet sync helpers (Phase A)</p>
      <p className="text-[11px] text-muted-foreground">
        Copies NET pricing fields only. Use{" "}
        <span className="font-semibold text-foreground">Sync all fleet rates</span> instead of clicking
        several buttons — other buttons are disabled while a sync runs. After sync, use Refresh if values
        look stale.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="default"
          className="h-8 text-xs"
          disabled={busy}
          onClick={handleSyncAllFleet}
        >
          {syncingId === "sync-all-fleet" ? (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : null}
          Sync all fleet rates
        </Button>
        {pairs.map((pair) => (
          <Button
            key={pair.id}
            type="button"
            size="sm"
            variant={pair.id === RETURN_MIRROR_PAIR.id ? "ghost" : "outline"}
            className="h-8 text-xs"
            disabled={busy}
            onClick={() => handleSync(pair)}
          >
            {syncingId === pair.id ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : null}
            {pair.label}
          </Button>
        ))}
      </div>
      {lastMessage && (
        <p className={`text-[11px] ${lastMessage.includes("failed") ? "text-red-400" : "text-muted-foreground"}`}>
          {lastMessage}
        </p>
      )}
    </div>
  );
}
