import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";

function escapeIlike(value: string) {
  return value.replace(/[%_,]/g, "\\$&");
}

async function resolveAuthUserId(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  email: string,
  redirectTo: string
): Promise<{ userId: string | null; warning: string | null }> {
  let userId: string | null = null;
  let warning: string | null = null;

  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (!inviteError && invited?.user?.id) {
    return { userId: invited.user.id, warning: null };
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });

  if (!createError && created?.user?.id) {
    userId = created.user.id;
    const { error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });
    if (linkError) warning = linkError.message;
    return { userId, warning };
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
        inviteError?.message ||
        createError?.message ||
        linkError?.message ||
        "Failed to resolve auth user",
    };
  }

  return {
    userId: linkData.user.id,
    warning:
      inviteError?.message ||
      createError?.message ||
      "User already existed; linked to customer",
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const hasPagination =
      searchParams.has("page") || searchParams.has("pageSize");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20),
      100
    );
    const q = (searchParams.get("q") || searchParams.get("search") || "").trim();
    const offset = (page - 1) * pageSize;

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

    if (!isSuperAdmin && !currentOrgId) {
      return NextResponse.json(
        { error: "No organization context found" },
        { status: 400 }
      );
    }

    const orgFilterId =
      isSuperAdmin && !currentOrgId ? null : (currentOrgId as string | null);

    const selectCols = `
      customer_id,
      auth_user_id,
      email,
      first_name,
      last_name,
      phone,
      date_of_birth,
      profile_photo_url,
      saved_address,
      is_active,
      organization_id,
      customer_created_at,
      customer_updated_at,
      temperature_preference,
      music_preference,
      communication_style,
      pet_friendly_default
    `;

    let query = supabase
      .from("customer_profiles_v1")
      .select(selectCols, { count: "exact" })
      .is("customer_deleted_at", null);

    if (orgFilterId) {
      query = query.eq("organization_id", orgFilterId);
    }

    if (q) {
      const pattern = `%${escapeIlike(q)}%`;
      query = query.or(
        `email.ilike."${pattern}",first_name.ilike."${pattern}",last_name.ilike."${pattern}",phone.ilike."${pattern}"`
      );
    }

    query = query.order("customer_created_at", { ascending: false });

    if (hasPagination) {
      query = query.range(offset, offset + pageSize - 1);
    }

    const { data: customers, error, count } = await query;

    if (error) {
      console.error("Error fetching customers:", error);
      return NextResponse.json(
        { error: "Failed to fetch customers" },
        { status: 500 }
      );
    }

    // Stats (org-scoped, not search-filtered) — cheap head counts
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const withOrg = <T extends { eq: (c: string, v: string) => T }>(qb: T) =>
      orgFilterId ? qb.eq("organization_id", orgFilterId) : qb;

    let totalQ = supabase
      .from("customer_profiles_v1")
      .select("customer_id", { count: "exact", head: true })
      .is("customer_deleted_at", null);
    totalQ = withOrg(totalQ);

    let activeQ = supabase
      .from("customer_profiles_v1")
      .select("customer_id", { count: "exact", head: true })
      .is("customer_deleted_at", null)
      .eq("is_active", true);
    activeQ = withOrg(activeQ);

    let inactiveQ = supabase
      .from("customer_profiles_v1")
      .select("customer_id", { count: "exact", head: true })
      .is("customer_deleted_at", null)
      .eq("is_active", false);
    inactiveQ = withOrg(inactiveQ);

    let newQ = supabase
      .from("customer_profiles_v1")
      .select("customer_id", { count: "exact", head: true })
      .is("customer_deleted_at", null)
      .gte("customer_created_at", firstDayOfMonth.toISOString());
    newQ = withOrg(newQ);

    const [totalRes, activeRes, inactiveRes, newRes] = await Promise.all([
      totalQ,
      activeQ,
      inactiveQ,
      newQ,
    ]);

    const stats = {
      total: totalRes.count || 0,
      active: activeRes.count || 0,
      inactive: inactiveRes.count || 0,
      newThisMonth: newRes.count || 0,
    };

    let enrichedCustomers = customers || [];

    if (enrichedCustomers.length > 0) {
      const orgIds = [...new Set(enrichedCustomers.map((c) => c.organization_id))];

      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);

      const orgMap: Record<string, string> = (orgs || []).reduce(
        (acc: Record<string, string>, org) => {
          acc[org.id] = org.name;
          return acc;
        },
        {}
      );

      enrichedCustomers = enrichedCustomers.map((customer) => ({
        ...customer,
        organization_name: orgMap[customer.organization_id] || "Unknown",
      }));
    }

    if (hasPagination) {
      return NextResponse.json({
        customers: enrichedCustomers,
        total: count || 0,
        page,
        pageSize,
        stats,
      });
    }

    return NextResponse.json({
      customers: enrichedCustomers,
      stats,
    });
  } catch (error) {
    console.error("Error in customers GET:", error);
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
      typeof body.phone === "string" ? body.phone.trim() || null : null;
    const invite = Boolean(body.invite);

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

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server misconfiguration: admin client unavailable" },
        { status: 500 }
      );
    }

    let authUserId: string | null = null;
    let inviteWarning: string | null = null;

    if (invite) {
      const redirectTo = `${request.nextUrl.origin}/login`;
      const resolved = await resolveAuthUserId(admin, email, redirectTo);
      if (!resolved.userId) {
        return NextResponse.json(
          { error: resolved.warning || "Failed to invite customer" },
          { status: 400 }
        );
      }
      authUserId = resolved.userId;
      inviteWarning = resolved.warning;
    }

    const { data: customer, error: insertError } = await admin
      .from("customers")
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        organization_id: currentOrgId,
        is_active: true,
        ...(authUserId ? { auth_user_id: authUserId } : {}),
      })
      .select("*")
      .single();

    if (insertError || !customer) {
      console.error("Error creating customer:", insertError);
      return NextResponse.json(
        {
          error: "Failed to create customer",
          details: insertError?.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      customer,
      ...(inviteWarning ? { warning: inviteWarning } : {}),
    });
  } catch (error) {
    console.error("Error in customers POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    const customerId =
      typeof body.customer_id === "string" ? body.customer_id.trim() : "";
    if (!customerId) {
      return NextResponse.json(
        { error: "customer_id is required" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return NextResponse.json(
          { error: "A valid email is required" },
          { status: 400 }
        );
      }
      updates.email = email;
    }
    if (typeof body.first_name === "string") {
      updates.first_name = body.first_name.trim();
    }
    if (typeof body.last_name === "string") {
      updates.last_name = body.last_name.trim();
    }
    if (typeof body.phone === "string") {
      updates.phone = body.phone.trim() || null;
    } else if (body.phone === null) {
      updates.phone = null;
    }
    if (typeof body.is_active === "boolean") {
      updates.is_active = body.is_active;
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server misconfiguration: admin client unavailable" },
        { status: 500 }
      );
    }

    const { data: customer, error: updateError } = await admin
      .from("customers")
      .update(updates)
      .eq("id", customerId)
      .eq("organization_id", currentOrgId)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (updateError || !customer) {
      console.error("Error updating customer:", updateError);
      return NextResponse.json(
        {
          error: "Failed to update customer",
          details: updateError?.message,
        },
        { status: updateError?.code === "PGRST116" ? 404 : 500 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Error in customers PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
