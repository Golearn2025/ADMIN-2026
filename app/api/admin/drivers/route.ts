import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { enrichDriversList } from "@/lib/features/drivers/enrichDriversList";

async function resolveAuthUserId(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  email: string,
  redirectTo: string,
  preferInvite: boolean
): Promise<{ userId: string | null; warning: string | null }> {
  let inviteErrorMsg: string | null = null;

  if (preferInvite) {
    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (!inviteError && invited?.user?.id) {
      return { userId: invited.user.id, warning: null };
    }
    inviteErrorMsg = inviteError?.message || null;
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });

  if (!createError && created?.user?.id) {
    let warning: string | null = inviteErrorMsg;
    if (preferInvite) {
      const { error: linkError } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo },
      });
      if (linkError) warning = linkError.message;
    }
    return { userId: created.user.id, warning };
  }

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

  if (linkError || !linkData?.user?.id) {
    return {
      userId: null,
      warning:
        inviteErrorMsg ||
        createError?.message ||
        linkError?.message ||
        "Failed to resolve auth user",
    };
  }

  return {
    userId: linkData.user.id,
    warning:
      inviteErrorMsg ||
      createError?.message ||
      "User already existed; linked to driver",
  };
}

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

/** Count uploaded docs per driver (any status): driver_documents + vehicle_documents */
async function fetchUploadedDocCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  driverIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (driverIds.length === 0) return counts;

  for (const id of driverIds) counts.set(id, 0);

  const { data: driverDocs } = await supabase
    .from("driver_documents")
    .select("driver_id")
    .in("driver_id", driverIds);

  for (const row of driverDocs ?? []) {
    if (!row.driver_id) continue;
    counts.set(row.driver_id, (counts.get(row.driver_id) ?? 0) + 1);
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

  if (vehicleIds.length > 0) {
    const { data: vehicleDocs } = await supabase
      .from("vehicle_documents")
      .select("vehicle_id")
      .in("vehicle_id", vehicleIds);

    for (const row of vehicleDocs ?? []) {
      const driverId = vehicleToDriver.get(row.vehicle_id);
      if (!driverId) continue;
      counts.set(driverId, (counts.get(driverId) ?? 0) + 1);
    }
  }

  return counts;
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
    const [expiringSoonIds, uploadedCounts] = await Promise.all([
      fetchDriverIdsWithExpiringSoon(supabase, driverIds),
      fetchUploadedDocCounts(supabase, driverIds),
    ]);

    const enrichedDrivers = enrichDriversList(
      drivers ?? [],
      expiringSoonIds,
      uploadedCounts
    );

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrgId = await getCurrentOrg(supabase, user.id);
    if (!currentOrgId) {
      return NextResponse.json(
        { error: "No organization context found" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const firstName =
      typeof body.first_name === "string" ? body.first_name.trim() : "";
    const lastName =
      typeof body.last_name === "string" ? body.last_name.trim() : "";
    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const invite = body.invite !== false;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 }
      );
    }

    if (!firstName) {
      return NextResponse.json(
        { error: "first_name is required" },
        { status: 400 }
      );
    }

    if (!lastName) {
      return NextResponse.json(
        { error: "last_name is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server misconfiguration: admin client unavailable" },
        { status: 500 }
      );
    }

    const redirectTo = `${request.nextUrl.origin}/login`;
    const resolved = await resolveAuthUserId(admin, email, redirectTo, invite);
    if (!resolved.userId) {
      return NextResponse.json(
        { error: resolved.warning || "Failed to create driver auth user" },
        { status: 400 }
      );
    }

    const { data: driver, error: insertError } = await admin
      .from("drivers")
      .insert({
        auth_user_id: resolved.userId,
        email,
        first_name: firstName,
        last_name: lastName,
        phone: phone || "",
        organization_id: currentOrgId,
        is_active: true,
      })
      .select("*")
      .single();

    if (insertError || !driver) {
      console.error("Error creating driver:", insertError);
      return NextResponse.json(
        {
          error: "Failed to create driver",
          details: insertError?.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      driver,
      ...(resolved.warning ? { warning: resolved.warning } : {}),
    });
  } catch (error) {
    console.error("Error in drivers POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
