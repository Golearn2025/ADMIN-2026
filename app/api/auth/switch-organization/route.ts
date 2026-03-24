import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setCurrentOrg } from "@/lib/auth/org";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organization ID from request
    const { organizationId } = await request.json();

    console.log('🔄 SWITCH ORGANIZATION:', {
      userId: user.id,
      newOrgId: organizationId
    });

    // Update user_context table with new organization
    // For "ALL", we set current_org_id to NULL
    const orgIdToSet = organizationId === "ALL" ? null : organizationId;
    
    await setCurrentOrg(supabase, user.id, orgIdToSet);

    console.log('✅ Organization switched successfully to:', organizationId);

    return NextResponse.json({ 
      success: true,
      currentOrganizationId: orgIdToSet
    });

  } catch (error) {
    console.error('Error switching organization:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
