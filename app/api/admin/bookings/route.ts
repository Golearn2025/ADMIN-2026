import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";

type BookingRow = Record<string, unknown> & { id: string };

function applyOrgFilter<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  isSuperAdmin: boolean,
  currentOrgId: string | null
): T {
  if (isSuperAdmin) {
    if (currentOrgId) return query.eq("organization_id", currentOrgId);
    return query;
  }
  if (!currentOrgId) {
    throw new Error("NO_ORG");
  }
  return query.eq("organization_id", currentOrgId);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    let page = parseInt(searchParams.get("page") || "1");
    let pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";

    if (page < 1) page = 1;
    if (pageSize < 1 || pageSize > 100) pageSize = 20;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrgId = await getCurrentOrg(supabase, user.id);
    const { data: isSuperAdmin } = await supabase.rpc(
      "get_user_super_admin_status",
      { user_id: user.id }
    );

    // ── Next up: paid + future (pinned top of table + strip) ───────────────
    let nextUpQuery = supabase
      .from("admin_booking_list")
      .select("*")
      .in("latest_payment_status", ["succeeded", "paid"])
      .gte("scheduled_at", new Date().toISOString())
      .not("status", "in", "(COMPLETED,CANCELLED)")
      .not("trip_status", "in", "(COMPLETED,CANCELLED)")
      .order("scheduled_at", { ascending: true })
      .limit(50);

    try {
      nextUpQuery = applyOrgFilter(nextUpQuery, !!isSuperAdmin, currentOrgId);
    } catch {
      return NextResponse.json(
        { error: "No organization context found" },
        { status: 400 }
      );
    }

    if (search) {
      nextUpQuery = nextUpQuery.or(`
        reference.ilike.%${search}%, 
        customer_first_name.ilike.%${search}%, 
        customer_last_name.ilike.%${search}%, 
        customer_email.ilike.%${search}%, 
        customer_phone.ilike.%${search}%
      `);
    }

    const { data: nextUpRaw, error: nextUpError } = await nextUpQuery;
    if (nextUpError) console.error("NEXT UP ERROR:", nextUpError);
    const nextUp = (nextUpRaw || []) as BookingRow[];
    const nextUpIds = nextUp.map((b) => b.id);
    const nextUpIdSet = new Set(nextUpIds);

    // ── Main list count (all bookings) ─────────────────────────────────────
    let countQuery = supabase
      .from("admin_booking_list")
      .select("*", { count: "exact", head: true });

    try {
      countQuery = applyOrgFilter(countQuery, !!isSuperAdmin, currentOrgId);
    } catch {
      return NextResponse.json(
        { error: "No organization context found" },
        { status: 400 }
      );
    }

    if (search) {
      countQuery = countQuery.or(`
        reference.ilike.%${search}%, 
        customer_first_name.ilike.%${search}%, 
        customer_last_name.ilike.%${search}%, 
        customer_email.ilike.%${search}%, 
        customer_phone.ilike.%${search}%
      `);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const total = count || 0;
    const nextUpCount = nextUp.length;
    const offset = (page - 1) * pageSize;

    // Pin next-up rows to the top of the table (scheduled ASC), then rest by created_at DESC
    let data: BookingRow[] = [];

    if (offset < nextUpCount) {
      const pinnedSlice = nextUp.slice(offset, offset + pageSize);
      const needRest = pageSize - pinnedSlice.length;

      if (needRest > 0) {
        let restQuery = supabase
          .from("admin_booking_list")
          .select("*")
          .order("created_at", { ascending: false })
          .range(0, needRest - 1);

        try {
          restQuery = applyOrgFilter(restQuery, !!isSuperAdmin, currentOrgId);
        } catch {
          return NextResponse.json(
            { error: "No organization context found" },
            { status: 400 }
          );
        }

        if (search) {
          restQuery = restQuery.or(`
            reference.ilike.%${search}%, 
            customer_first_name.ilike.%${search}%, 
            customer_last_name.ilike.%${search}%, 
            customer_email.ilike.%${search}%, 
            customer_phone.ilike.%${search}%
          `);
        }

        if (nextUpIds.length > 0) {
          restQuery = restQuery.not(
            "id",
            "in",
            `(${nextUpIds.join(",")})`
          );
        }

        const { data: rest, error: restError } = await restQuery;
        if (restError) {
          return NextResponse.json({ error: restError.message }, { status: 500 });
        }
        data = [
          ...pinnedSlice,
          ...((rest || []) as BookingRow[]).filter((r) => !nextUpIdSet.has(r.id)),
        ];
      } else {
        data = pinnedSlice;
      }
    } else {
      // Past the pinned block — page through the remaining (non next-up) rows
      const restOffset = offset - nextUpCount;
      let restQuery = supabase
        .from("admin_booking_list")
        .select("*")
        .order("created_at", { ascending: false })
        .range(restOffset, restOffset + pageSize - 1);

      try {
        restQuery = applyOrgFilter(restQuery, !!isSuperAdmin, currentOrgId);
      } catch {
        return NextResponse.json(
          { error: "No organization context found" },
          { status: 400 }
        );
      }

      if (search) {
        restQuery = restQuery.or(`
          reference.ilike.%${search}%, 
          customer_first_name.ilike.%${search}%, 
          customer_last_name.ilike.%${search}%, 
          customer_email.ilike.%${search}%, 
          customer_phone.ilike.%${search}%
        `);
      }

      if (nextUpIds.length > 0) {
        restQuery = restQuery.not("id", "in", `(${nextUpIds.join(",")})`);
      }

      const { data: rest, error: restError } = await restQuery;
      if (restError) {
        return NextResponse.json({ error: restError.message }, { status: 500 });
      }
      data = ((rest || []) as BookingRow[]).filter((r) => !nextUpIdSet.has(r.id));
    }

    return NextResponse.json({
      data,
      nextUp,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("CRASH:", err);
    return NextResponse.json({ error: "Server crash" }, { status: 500 });
  }
}
