/**
 * GET /api/admin/driver-payouts/wise-batch?id=<batchGroupId>
 * Debug: fetch batch + transfer summaries from Wise live/sandbox.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getBatchGroup,
  getTransfer,
  getWiseConfig,
  listWiseProfiles,
  resolveBusinessProfileId,
} from "@/lib/features/driver-payouts/wise-api";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id query required" }, { status: 400 });
    }

    const cfg = getWiseConfig();
    const profiles = await listWiseProfiles();
    const profileId = await resolveBusinessProfileId();
    const batch = await getBatchGroup({ profileId, batchGroupId: id });
    const transferIds = Array.isArray(batch.transferIds) ? batch.transferIds : [];
    const transfers = [];
    for (const tid of transferIds.slice(0, 20)) {
      try {
        transfers.push(await getTransfer(tid));
      } catch (err) {
        transfers.push({
          id: tid,
          error: err instanceof Error ? err.message : "fetch failed",
        });
      }
    }

    return NextResponse.json({
      env: cfg.env,
      portalUrl: cfg.portalUrl,
      profileId,
      profiles: profiles.map((p) => ({
        id: p.id,
        type: p.type,
        name:
          (p.details as { name?: string } | undefined)?.name ||
          [
            (p.details as { firstName?: string } | undefined)?.firstName,
            (p.details as { lastName?: string } | undefined)?.lastName,
          ]
            .filter(Boolean)
            .join(" "),
      })),
      batch,
      transferCount: transferIds.length,
      transfers,
      hint:
        transferIds.length === 0
          ? "Batch exists but has 0 transfers — Pay with Wise did not attach payments. Retry after refresh."
          : `Open ${cfg.portalUrl} logged into the SAME Wise account as the API token. Switch to the ${
              profiles.find((p) => p.id === profileId)?.type || "business"
            } profile. Look under Transfers/Activity for transfer ids, or Tasks if status is paused.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
