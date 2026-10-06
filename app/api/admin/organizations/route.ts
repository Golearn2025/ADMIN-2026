import { NextRequest, NextResponse } from "next/server";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type OrgMember = { user_id: string; role: string; auth_users: { email: string } };

/** auth.users is not exposed to PostgREST, so emails come from the Auth admin API. */
async function getMembersByOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgIds: string[]
): Promise<Map<string, OrgMember[]>> {
  const byOrg = new Map<string, OrgMember[]>();
  if (!orgIds.length) return byOrg;

  const admin = createAdminClient();
  const { data: rows, error } = await (admin ?? supabase)
    .from("organization_members")
    .select("organization_id, user_id, role")
    .in("organization_id", orgIds);

  if (error) {
    console.error("Error fetching organization members:", error);
    return byOrg;
  }

  const emailById = new Map<string, string>();
  if (admin) {
    const userIds = Array.from(new Set((rows || []).map((r) => r.user_id)));
    await Promise.all(
      userIds.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data?.user?.email) emailById.set(id, data.user.email);
      })
    );
  }

  for (const row of rows || []) {
    const list = byOrg.get(row.organization_id) ?? [];
    list.push({
      user_id: row.user_id,
      role: row.role,
      auth_users: { email: emailById.get(row.user_id) ?? "" },
    });
    byOrg.set(row.organization_id, list);
  }
  return byOrg;
}

export async function GET(request: NextRequest) {
  try {
    const { orgId, hasAccess, isSuperAdmin } = await getUserRole();

    console.log('API: getUserRole result:', { orgId, hasAccess, isSuperAdmin });

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    if (isSuperAdmin) {
      console.log('🔍 SUPER ADMIN - Fetching ALL organizations...');
      
      // Super Admin can see all organizations - first get orgs without member restriction
      const { data: organizations, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('🔍 Organizations query result:', {
        count: organizations?.length,
        orgs: organizations?.map(o => ({ id: o.id, name: o.name })),
        error
      });

      if (error) {
        console.error('Error fetching organizations:', error);
        return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
      }

      const membersByOrg = await getMembersByOrg(
        supabase,
        organizations.map((org) => org.id)
      );

      const orgsWithMembers = organizations.map((org) => {
        const members = membersByOrg.get(org.id) ?? [];
        return {
          ...org,
          members,
          organization_members: members,
          member_count: members.length,
        };
      });

      return NextResponse.json({ 
        organizations: orgsWithMembers,
        isSuperAdmin: true 
      });
    } else {
      // Regular users see only their organization
      if (!orgId) {
        return NextResponse.json({ error: "No organization context" }, { status: 400 });
      }

      const { data: organization, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (error) {
        console.error('Error fetching organization:', error);
        return NextResponse.json({ error: "Failed to fetch organization" }, { status: 500 });
      }

      const members = (await getMembersByOrg(supabase, [organization.id])).get(organization.id) ?? [];

      return NextResponse.json({ 
        organizations: [{ ...organization, members, organization_members: members, member_count: members.length }],
        isSuperAdmin: false 
      });
    }
  } catch (error) {
    console.error('Error in organizations GET:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Check if user is super admin
    const { data: { user } } = await supabase.auth.getUser();
    const { data: currentUser } = await supabase
      .from('auth.users')
      .select('is_super_admin')
      .eq('id', user?.id)
      .single();

    const isSuperAdmin = currentUser?.is_super_admin;

    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Only super admins can create organizations" }, { status: 403 });
    }

    const body = await request.json();
    const { name, org_type, admin_email, timezone = 'Europe/London', currency = 'GBP' } = body;

    if (!name || !org_type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
    }

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        org_type,
        is_active: true,
        is_default: false,
        created_by: user?.id
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
    }

    // Create organization settings
    const { error: settingsError } = await supabase
      .from('organization_settings')
      .insert({
        organization_id: organization.id,
        timezone,
        currency,
        platform_commission_pct: 0.10,
        operator_commission_pct: 0.09,
        pricing_source: 'render',
        vat_rate: 0.20,
        booking_lead_time_hours: 2,
        max_advance_booking_days: 365
      });

    if (settingsError) {
      console.error('Error creating organization settings:', settingsError);
      // Continue anyway, organization is created
    }

    // Add admin if provided
    if (admin_email) {
      // Find user by email
      const { data: adminUser } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', admin_email)
        .single();

      if (adminUser) {
        // Add as organization admin
        await supabase
          .from('organization_members')
          .insert({
            organization_id: organization.id,
            user_id: adminUser.id,
            role: 'root'
          });
      }
    }

    return NextResponse.json({ 
      organization,
      message: "Organization created successfully"
    });
  } catch (error) {
    console.error('Error in organizations POST:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
