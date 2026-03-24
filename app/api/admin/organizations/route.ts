import { NextRequest, NextResponse } from "next/server";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

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

      // Then get members for each organization separately
      const orgsWithMembers = await Promise.all(
        organizations.map(async (org) => {
          const { data: members, error: membersError } = await supabase
            .from('organization_members')
            .select(`
              user_id,
              role,
              auth_users!inner(
                email
              )
            `)
            .eq('organization_id', org.id);

          console.log(`🔍 Members for ${org.name}:`, {
            count: members?.length || 0,
            error: membersError
          });

          return {
            ...org,
            organization_members: members || [],
            member_count: members?.length || 0
          };
        })
      );

      if (error) {
        console.error('Error fetching organizations:', error);
        return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
      }

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

      return NextResponse.json({ 
        organizations: [organization],
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
