import { getUserRole } from "@/lib/auth/roles";
import { buildBookingEconomics } from "@/lib/bookings/economics/build-booking-economics";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyOrganizationFilter, getOrganizationContext } from "@/lib/multi-tenant";
import { NextRequest, NextResponse } from "next/server";

const IBF_SELECT =
  "id, quote_id, gross_margin_pence, net_margin_pence, driver_extras_payout_pence, driver_target_payout_pence, driver_base_payout_pence, driver_payout_pence, processor_fee_pence, calculated_at, version, line_items, pricing_source";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const admin = createAdminClient();

    const { hasAccess } = await getUserRole();
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const orgContext = await getOrganizationContext(request);

    // Access check via admin-safe view + org filter
    let breakdownQuery = admin
      .from("admin_booking_financial_breakdown")
      .select("*")
      .eq("booking_id", bookingId);
    breakdownQuery = applyOrganizationFilter(breakdownQuery, orgContext);

    const { data: breakdown, error: breakdownError } = await breakdownQuery.maybeSingle();

    if (breakdownError) {
      console.error("Error fetching booking financial breakdown:", breakdownError);
      return NextResponse.json({ error: "Failed to fetch booking economics" }, { status: 500 });
    }

    if (!breakdown) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

  // internal_* tables deny SELECT for authenticated — service role after org gate above
    const { data: ibfRows, error: ibfError } = await admin
      .from("internal_booking_financials")
      .select(IBF_SELECT)
      .eq("booking_id", bookingId)
      .order("calculated_at", { ascending: false })
      .order("version", { ascending: false });

    if (ibfError) {
      console.error("Error fetching internal booking financials:", ibfError);
      return NextResponse.json({ error: "Failed to fetch booking economics" }, { status: 500 });
    }

    const { data: legRows, error: legError } = await admin
      .from("internal_leg_financials")
      .select(
        "booking_leg_id, booking_id, driver_target_payout_pence, driver_estimated_payout_pence, driver_payout_pence, line_items"
      )
      .eq("booking_id", bookingId);

    if (legError) {
      console.error("Error fetching leg financials:", legError);
      return NextResponse.json({ error: "Failed to fetch booking economics" }, { status: 500 });
    }

    const { data: bookingLegs } = await admin
      .from("booking_legs")
      .select("id, leg_number")
      .eq("booking_id", bookingId);

    const legNumberById = new Map(
      (bookingLegs ?? []).map((leg) => [leg.id as string, leg.leg_number as number])
    );

    const legFinancials = (legRows ?? []).map((row) => ({
      ...row,
      leg_number: legNumberById.get(row.booking_leg_id as string) ?? 0,
    }));

    const quoteIdFromIbf = (ibfRows ?? []).find((row) => row.quote_id)?.quote_id as
      | string
      | undefined;

    let quote: Record<string, unknown> | null = null;

    if (quoteIdFromIbf) {
      const { data: quoteRow } = await admin
        .from("client_booking_quotes")
        .select("id, created_at, line_items")
        .eq("id", quoteIdFromIbf)
        .maybeSingle();
      quote = quoteRow;
    }

    if (!quote) {
      const { data: quoteByBooking } = await admin
        .from("client_booking_quotes")
        .select("id, created_at, line_items")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      quote = quoteByBooking;
    }

    const payload = buildBookingEconomics({
      bookingId,
      breakdown,
      internalFinancialRows: ibfRows ?? [],
      quote,
      legFinancials,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Unexpected error in booking economics route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
