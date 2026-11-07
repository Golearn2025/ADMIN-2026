/**
 * GET /api/admin/bookings/assignable-drivers?q=
 * Approved drivers for assign/reassign picker.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
    const admin = createAdminClient();
    const db = admin ?? supabase;

    let query = db
      .from("drivers")
      .select("id, first_name, last_name, phone, status")
      .eq("status", "approved")
      .is("deleted_at", null)
      .order("first_name", { ascending: true })
      .limit(40);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let rows = (data || []).map((d) => ({
      id: d.id as string,
      name: `${d.first_name || ""} ${d.last_name || ""}`.trim() || "Driver",
      phone: (d.phone as string) || "",
      status: d.status as string,
    }));

    if (q) {
      rows = rows.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.phone.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[assignable-drivers]", err);
    return NextResponse.json({ error: "Failed to load drivers" }, { status: 500 });
  }
}
