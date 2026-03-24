import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get pagination params
    let page = parseInt(searchParams.get('page') || '1');
    let pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';

    // Validate pagination
    if (page < 1) page = 1;
    if (pageSize < 1 || pageSize > 100) pageSize = 20;

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

    // Base query from VIEW - SINGLE SOURCE OF TRUTH
    let query = supabase
      .from("admin_booking_list")
      .select("*", { count: "exact" });

    // Apply search filter (enterprise backend-controlled)
    if (search) {
      query = query.or(`
        reference.ilike.%${search}%, 
        customer_first_name.ilike.%${search}%, 
        customer_last_name.ilike.%${search}%, 
        customer_email.ilike.%${search}%, 
        customer_phone.ilike.%${search}%
      `);
    }

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

    // Apply pagination - ENTERPRISE STANDARD
    const offset = (page - 1) * pageSize;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    console.log('📅 BOOKINGS API DEBUG (Backend-Controlled):');
    console.log('   userId:', user.id);
    console.log('   currentOrgId (from DB):', currentOrgId);
    console.log('   isSuperAdmin:', !!isSuperAdmin);
    console.log('   bookings returned:', data?.length || 0);
    console.log('   total count:', count);
    console.log('   page:', page, 'pageSize:', pageSize);

    if (error) {
      console.error("BOOKINGS ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    });
  } catch (err) {
    console.error("CRASH:", err);
    return NextResponse.json({ error: "Server crash" }, { status: 500 });
  }
}
