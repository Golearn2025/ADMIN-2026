import { createClient } from "@/lib/supabase/server";
import { autoSetOrganization } from "@/lib/auth/org";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-detect and set organization for user
    console.log('🔍 SET-ORG-API DEBUG - Calling autoSetOrganization for user:', user.id);
    const selectedOrgId = await autoSetOrganization(supabase, user.id);
    console.log('🔍 SET-ORG-API DEBUG - autoSetOrganization returned:', selectedOrgId);

    // Get user's organizations for response
    const { data: memberships, error: membersError } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        organizations!inner (
          id,
          name
        )
      `)
      .eq('user_id', user.id);

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase
      .rpc('get_user_super_admin_status', { user_id: user.id });

    const organizations = memberships || [];

    return NextResponse.json({
      success: true,
      userId: user.id,
      currentOrganizationId: selectedOrgId,
      isSuperAdmin: !!isSuperAdmin,
      organizations: organizations.map((m: any) => ({
        id: m.organization_id,
        name: m.organizations.name,
        role: m.role
      })),
      autoSelected: !!selectedOrgId
    });

  } catch (error) {
    console.error("Error setting organization context:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
