import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";

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

    // DEBUG: Backend-controlled context
    console.log("🔍 CUSTOMERS API DEBUG (Backend-Controlled):");
    console.log("   userId:", user.id);
    console.log("   currentOrgId (from DB):", currentOrgId);
    console.log("   isSuperAdmin:", !!isSuperAdmin);

    // Base query from VIEW
    let query = supabase
      .from('customer_profiles_v1')
      .select(`
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
      `)
      .is('customer_deleted_at', null);

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

    query = query.order('customer_created_at', { ascending: false });

    const { data: customers, error } = await query;

    // DEBUG: Vezi ce returnează query-ul
    console.log("   customers returned:", customers?.length || 0);
    console.log("   error:", error);

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }

    // Fetch organization names for multi-tenant support
    if (customers && customers.length > 0) {
      const orgIds = [...new Set(customers.map(c => c.organization_id))];
      
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', orgIds);

      const orgMap: { [key: string]: string } = (orgs || []).reduce((acc: { [key: string]: string }, org) => {
        acc[org.id] = org.name;
        return acc;
      }, {});

      const enrichedCustomers = customers.map(customer => ({
        ...customer,
        organization_name: orgMap[customer.organization_id] || 'Unknown'
      }));

      return NextResponse.json({ customers: enrichedCustomers });
    }

    return NextResponse.json({ customers: customers || [] });
  } catch (error) {
    console.error('Error in customers GET:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
