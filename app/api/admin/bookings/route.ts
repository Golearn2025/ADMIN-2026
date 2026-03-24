import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
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

    // Base query from VIEW
    let query = supabase
      .from("admin_booking_list")
      .select("*");

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

    const { data, error } = await query.limit(20);

    console.log('📅 BOOKINGS API DEBUG (Backend-Controlled):');
    console.log('   userId:', user.id);
    console.log('   currentOrgId (from DB):', currentOrgId);
    console.log('   isSuperAdmin:', !!isSuperAdmin);
    console.log('   bookings returned:', data?.length || 0);

    if (error) {
      console.error("BOOKINGS ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("CRASH:", err);
    return NextResponse.json({ error: "Server crash" }, { status: 500 });
  }
}
