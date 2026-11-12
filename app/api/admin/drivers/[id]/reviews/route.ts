/**
 * GET /api/admin/drivers/[id]/reviews
 * Customer→driver reviews for a driver (booking_ratings).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/auth/roles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: driverId } = await params;
    const { hasAccess } = await getUserRole();
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const admin = createAdminClient() ?? supabase;

    const { data: driver, error: driverErr } = await admin
      .from("drivers")
      .select("id, first_name, last_name, rating_average, rating_count, organization_id")
      .eq("id", driverId)
      .is("deleted_at", null)
      .maybeSingle();

    if (driverErr || !driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const { data: rows, error } = await admin
      .from("booking_ratings")
      .select("id, booking_id, driver_id, rating, comment, rated_at, created_at")
      .eq("driver_id", driverId)
      .order("rated_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const bookingIds = (rows || []).map((r) => r.booking_id).filter(Boolean);
    const bookingsById = new Map<
      string,
      { reference: string | null; customer_id: string | null }
    >();
    const customersById = new Map<
      string,
      { first_name: string | null; last_name: string | null; email: string | null }
    >();

    if (bookingIds.length) {
      const { data: bookings } = await admin
        .from("bookings")
        .select("id, reference, customer_id")
        .in("id", bookingIds);
      for (const b of bookings || []) {
        bookingsById.set(b.id, {
          reference: b.reference,
          customer_id: b.customer_id,
        });
      }

      const customerIds = [
        ...new Set(
          (bookings || [])
            .map((b) => b.customer_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];
      if (customerIds.length) {
        const { data: customers } = await admin
          .from("customers")
          .select("id, first_name, last_name, email")
          .in("id", customerIds);
        for (const c of customers || []) {
          customersById.set(c.id, {
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email,
          });
        }
      }
    }

    const reviews = (rows || []).map((r) => {
      const booking = bookingsById.get(r.booking_id);
      const customer = booking?.customer_id
        ? customersById.get(booking.customer_id)
        : null;
      const customerName = customer
        ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
        : null;

      return {
        id: r.id,
        bookingId: r.booking_id,
        bookingReference: booking?.reference ?? null,
        rating: r.rating,
        comment: r.comment,
        ratedAt: r.rated_at,
        customerName: customerName || "Customer",
        customerEmail: customer?.email ?? null,
      };
    });

    return NextResponse.json({
      driver: {
        id: driver.id,
        name: `${driver.first_name || ""} ${driver.last_name || ""}`.trim(),
        ratingAverage: Number(driver.rating_average || 0),
        ratingCount: Number(driver.rating_count || 0),
      },
      reviews,
    });
  } catch (err) {
    console.error("[drivers/reviews]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
