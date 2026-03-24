import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organizations and roles
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

    if (membersError) {
      console.error("Error fetching memberships:", membersError);
      return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
    }

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase
      .rpc('get_user_super_admin_status', { user_id: user.id });

    const organizations = memberships || [];
    
    // Auto-detect logic
    let autoSelectOrg = null;
    let shouldAsk = false;

    if (organizations.length === 1) {
      // User has exactly one organization - auto-select it
      const org = organizations[0] as any;
      autoSelectOrg = {
        id: org.organization_id,
        name: org.organizations.name,
        role: org.role
      };
    } else if (organizations.length > 1) {
      // User has multiple organizations - ask which one
      shouldAsk = true;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      isSuperAdmin: !!isSuperAdmin,
      organizations: organizations.map((m: any) => ({
        id: m.organization_id,
        name: m.organizations.name,
        role: m.role
      })),
      autoSelectOrg,
      shouldAsk
    });

  } catch (error) {
    console.error("Error in organization context:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
