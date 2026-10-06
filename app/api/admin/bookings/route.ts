import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";

type BookingRow = Record<string, unknown> & { id: string };

const SEARCH_COLUMNS = [
  "reference",
  "customer_first_name",
  "customer_last_name",
  "customer_email",
  "customer_phone",
  "driver_name",
  "driver_phone",
  "pickup_address",
  "dropoff_address",
  "vehicle_plate",
] as const;

/** PostgREST `or` values must be quoted so commas, dots or parentheses in user input don't break parsing. */
function quoteFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * One `or` group per search word (groups are ANDed), so "Cristian Manolache" matches
 * first + last name. Driver email is not in admin_booking_list, so it resolves to driver ids.
 */
async function buildSearchFilters(
  supabase: Awaited<ReturnType<typeof createClient>>,
  search: string
): Promise<string[]> {
  const words = search.trim().split(/\s+/).filter(Boolean).slice(0, 5);

  return Promise.all(
    words.map(async (word) => {
      const pattern = quoteFilterValue(`%${word}%`);
      const clauses: string[] = SEARCH_COLUMNS.map((col) => `${col}.ilike.${pattern}`);

      const { data: drivers } = await supabase
        .from("drivers")
        .select("id")
        .ilike("email", `%${word}%`)
        .limit(50);
      const driverIds = (drivers || []).map((d) => d.id);
      if (driverIds.length) clauses.push(`assigned_driver_id.in.(${driverIds.join(",")})`);

      return clauses.join(",");
    })
  );
}

function applySearch<T extends { or: (filters: string) => T }>(query: T, filters: string[]): T {
  return filters.reduce((q, f) => q.or(f), query);
}

type SegmentQuery<T> = {
  or: (filters: string) => T;
  neq: (column: string, value: string) => T;
};
type ListSegment = <T extends SegmentQuery<T>>(query: T) => T;

const NOT_CANCELLED: ListSegment = (q) =>
  q.neq("status", "CANCELLED").or("trip_status.is.null,trip_status.neq.CANCELLED");

/**
 * Table order after the pinned next-up block. Segments must stay disjoint and together
 * cover every booking, otherwise rows get duplicated or disappear from pagination.
 */
const LIST_SEGMENTS: ListSegment[] = [
  // Completed or paid trips (recent first)
  (q) => NOT_CANCELLED(q).or("status.eq.COMPLETED,latest_payment_status.in.(succeeded,paid)"),
  // Unpaid / pending payment
  (q) =>
    NOT_CANCELLED(q)
      .neq("status", "COMPLETED")
      .or("latest_payment_status.is.null,latest_payment_status.not.in.(succeeded,paid)"),
  // Cancelled
  (q) => q.or("status.eq.CANCELLED,trip_status.eq.CANCELLED"),
];

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

    const searchFilters = search ? await buildSearchFilters(supabase, search) : [];

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

    nextUpQuery = applySearch(nextUpQuery, searchFilters);

    const { data: nextUpRaw, error: nextUpError } = await nextUpQuery;
    if (nextUpError) console.error("NEXT UP ERROR:", nextUpError);
    const nextUp = (nextUpRaw || []) as BookingRow[];
    const nextUpIds = nextUp.map((b) => b.id);
    const nextUpIdSet = new Set(nextUpIds);

    const segmentQuery = (segment: ListSegment, countOnly = false) => {
      let query = countOnly
        ? supabase.from("admin_booking_list").select("*", { count: "exact", head: true })
        : supabase.from("admin_booking_list").select("*");
      query = segment(applySearch(applyOrgFilter(query, !!isSuperAdmin, currentOrgId), searchFilters));
      if (nextUpIds.length > 0) {
        query = query.not("id", "in", `(${nextUpIds.join(",")})`);
      }
      return query;
    };

    const segmentCounts = await Promise.all(
      LIST_SEGMENTS.map((segment) => segmentQuery(segment, true))
    );
    const countError = segmentCounts.find((r) => r.error)?.error;
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    const counts = segmentCounts.map((r) => r.count || 0);

    const total = nextUp.length + counts.reduce((sum, c) => sum + c, 0);
    const offset = (page - 1) * pageSize;

    // Pinned next-up rows (scheduled ASC), then each segment by trip date DESC
    const data: BookingRow[] = nextUp.slice(offset, offset + pageSize);
    let cursor = Math.max(0, offset - nextUp.length);

    for (let i = 0; i < LIST_SEGMENTS.length && data.length < pageSize; i++) {
      if (cursor >= counts[i]) {
        cursor -= counts[i];
        continue;
      }
      const need = pageSize - data.length;
      const { data: rows, error: rowsError } = await segmentQuery(LIST_SEGMENTS[i])
        .order("scheduled_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(cursor, cursor + need - 1);
      if (rowsError) {
        return NextResponse.json({ error: rowsError.message }, { status: 500 });
      }
      data.push(...((rows || []) as BookingRow[]).filter((r) => !nextUpIdSet.has(r.id)));
      cursor = 0;
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
