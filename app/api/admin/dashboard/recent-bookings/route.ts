import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: bookings, error } = await supabase
      .from("admin_booking_list")
      .select("id, reference, created_at, scheduled_at, booking_type, status, customer_first_name, customer_last_name, display_price_pence, latest_payment_status")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Recent bookings error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (error) {
    console.error("Recent bookings exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
