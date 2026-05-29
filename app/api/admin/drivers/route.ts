import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { enrichDriversList } from "@/lib/features/drivers/enrichDriversList";

function expiringSoonDateRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);
  return {
    from: today.toISOString().slice(0, 10),
    to: in30.toISOString().slice(0, 10),
  };
}

async function fetchDriverIdsWithExpiringSoon(
  supabase: Awaited<ReturnType<typeof createClient>>,
  driverIds: string[]
): Promise<Set<string>> {
  const expiring = new Set<string>();
  if (driverIds.length === 0) return expiring;

  const { from, to } = expiringSoonDateRange();

  const { data: driverDocs } = await supabase
    .from("driver_documents")
    .select("driver_id")
    .in("driver_id", driverIds)
    .not("expiry_date", "is", null)
    .gte("expiry_date", from)
    .lte("expiry_date", to);

  for (const row of driverDocs ?? []) {
    if (row.driver_id) expiring.add(row.driver_id);
  }

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, driver_id")
    .in("driver_id", driverIds)
    .is("deleted_at", null);

  const vehicleIds = (vehicles ?? []).map((v) => v.id);
  const vehicleToDriver = new Map(
    (vehicles ?? []).map((v) => [v.id, v.driver_id] as const)
  );

  if (vehicleIds.length === 0) return expiring;

  const { data: vehicleDocs } = await supabase
    .from("vehicle_documents")
    .select("vehicle_id")
    .in("vehicle_id", vehicleIds)
    .not("expiry_date", "is", null)
    .gte("expiry_date", from)
    .lte("expiry_date", to);

  for (const row of vehicleDocs ?? []) {
    const driverId = vehicleToDriver.get(row.vehicle_id);
    if (driverId) expiring.add(driverId);
  }

  return expiring;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current organization from database (backend-controlled)
    const currentOrgId = await getCurrentOrg(supabase, user.id);

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase
      .rpc('get_user_super_admin_status', { user_id: user.id });

    // Base query from VIEW
    let query = supabase
      .from("admin_drivers_list_v4")
      .select("*")
      .order("first_name", { ascending: true });

    // Backend-controlled filtering
    // Super admin with specific org selected: filter by that org
    // Super admin with NULL org (ALL): no filter
    // Normal user: always filter by their org
    if (isSuperAdmin) {
      // Super admin: filter only if org is selected
      if (currentOrgId) {
        query = query.eq("organization_id", currentOrgId);
      }
      // If currentOrgId is NULL, no filter (see ALL)
    } else {
      // Normal user: must have org context
      if (!currentOrgId) {
        return NextResponse.json({ error: "No organization context found" }, { status: 400 });
      }
      query = query.eq("organization_id", currentOrgId);
    }

    const { data: drivers, error } = await query;

    const driverIds = (drivers ?? []).map((d) => d.id);
    const expiringSoonIds = await fetchDriverIdsWithExpiringSoon(
      supabase,
      driverIds
    );

    const enrichedDrivers = enrichDriversList(drivers ?? [], expiringSoonIds);

    console.log('👨‍💼 DRIVERS API DEBUG (Backend-Controlled):');
    console.log('   userId:', user.id);
    console.log('   currentOrgId (from DB):', currentOrgId);
    console.log('   isSuperAdmin:', !!isSuperAdmin);
    console.log('   drivers returned:', enrichedDrivers?.length || 0);

    if (error) {
      console.error("Error fetching drivers:", error);
      return NextResponse.json({ error: "Failed to fetch drivers" }, { status: 500 });
    }

    return NextResponse.json({ drivers: enrichedDrivers });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
