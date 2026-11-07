/**
 * POST /api/admin/flights/status
 * One-shot AeroDataBox lookup for admin Flight Info (no polling).
 * Body: { flightNumber: string, date?: string (YYYY-MM-DD), scheduledAt?: string (ISO) }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  londonDateYmd,
  lookupFlightArrivalStatus,
} from "@/lib/flights/aerodatabox";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const flightNumber =
      typeof body.flightNumber === "string" ? body.flightNumber.trim() : "";
    if (!flightNumber || flightNumber.length < 2) {
      return NextResponse.json(
        { success: false, error: "flightNumber is required" },
        { status: 400 }
      );
    }

    const dateYmd =
      (typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
        ? body.date
        : null) ||
      londonDateYmd(typeof body.scheduledAt === "string" ? body.scheduledAt : null);

    if (!dateYmd) {
      return NextResponse.json(
        { success: false, error: "date or scheduledAt is required" },
        { status: 400 }
      );
    }

    if (!process.env.AERODATABOX_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "AERODATABOX_API_KEY missing — add the same key as the website",
        },
        { status: 503 }
      );
    }

    const result = await lookupFlightArrivalStatus({ flightNumber, dateYmd });
    return NextResponse.json({
      success: true,
      found: Boolean(result),
      date: dateYmd,
      checkedAt: new Date().toISOString(),
      result,
    });
  } catch (err) {
    console.error("[admin/flights/status]", err);
    const msg = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
