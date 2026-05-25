"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import {
  FLEET_SYNC_PAIRS,
  planVehicleRateSync,
  RETURN_MIRROR_PAIR,
  type VehicleRateRow,
  type VehicleRateSyncPair,
} from "@/components/pricing/pricingVehicleRateSync";

type Props = {
  allVehicleRows: VehicleRateRow[];
  onSyncPlans: (plans: Array<{ targetId: string; updates: Record<string, unknown> }>) => Promise<void>;
  showReturnMirror?: boolean;
};

async function runPairSync(
  pair: VehicleRateSyncPair,
  allVehicleRows: VehicleRateRow[],
  onSyncPlans: Props["onSyncPlans"]
): Promise<{ updated: number; skipped: number }> {
  const plans = planVehicleRateSync(
    allVehicleRows,
    pair.sourceBookingType,
    pair.targetBookingType
  );
  if (plans.length === 0) {
    return { updated: 0, skipped: 0 };
  }
  const ok = window.confirm(
    `${pair.label}\n\nThis will update ${plans.length} vehicle rate row(s) for booking type "${pair.targetBookingType}".\n` +
      `Source: ${pair.sourceBookingType}. Organization and pricing version are matched per vehicle.\n\nContinue?`
  );
  if (!ok) return { updated: 0, skipped: plans.length };

  await onSyncPlans(plans.map((p) => ({ targetId: p.targetId, updates: p.updates })));
  return { updated: plans.length, skipped: 0 };
}

export function VehicleRatesSyncToolbar({
  allVehicleRows,
  onSyncPlans,
  showReturnMirror = true,
}: Props) {
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const pairs = showReturnMirror ? [...FLEET_SYNC_PAIRS, RETURN_MIRROR_PAIR] : FLEET_SYNC_PAIRS;

  const handleSync = async (pair: VehicleRateSyncPair) => {
    setSyncingId(pair.id);
    setLastMessage(null);
    try {
      const { updated, skipped } = await runPairSync(pair, allVehicleRows, onSyncPlans);
      if (updated > 0) {
        setLastMessage(`Updated ${updated} row(s) (${pair.targetBookingType}).`);
      } else if (skipped > 0) {
        setLastMessage("Sync cancelled.");
      } else {
        setLastMessage("No rows to update — targets already match sources or rows are missing.");
      }
    } catch (e: unknown) {
      setLastMessage(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/15 px-4 py-3 space-y-2">
      <p className="text-xs font-semibold text-foreground">Fleet sync helpers (Phase A)</p>
      <p className="text-[11px] text-muted-foreground">
        Copies NET pricing fields only. Keeps organization, version, and vehicle category unchanged. Fleet rows stay
        editable after sync.
      </p>
      <div className="flex flex-wrap gap-2">
        {pairs.map((pair) => (
          <Button
            key={pair.id}
            type="button"
            size="sm"
            variant={pair.id === RETURN_MIRROR_PAIR.id ? "ghost" : "outline"}
            className="h-8 text-xs"
            disabled={syncingId !== null}
            onClick={() => handleSync(pair)}
          >
            {syncingId === pair.id ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : null}
            {pair.label}
          </Button>
        ))}
      </div>
      {lastMessage && <p className="text-[11px] text-muted-foreground">{lastMessage}</p>}
    </div>
  );
}
