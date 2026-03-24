import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg, setCurrentOrg } from "@/lib/auth/org";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    // Verify user has access to this organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: "Access denied to this organization" }, { status: 403 });
    }

    // Set the new organization in database
    const success = await setCurrentOrg(supabase, user.id, organizationId);

    if (!success) {
      return NextResponse.json({ error: "Failed to switch organization" }, { status: 500 });
    }

    // Get current organization after switch
    const currentOrg = await getCurrentOrg(supabase, user.id);

    return NextResponse.json({
      success: true,
      currentOrganizationId: currentOrg,
      message: "Organization switched successfully"
    });

  } catch (error) {
    console.error("Error switching organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current organization
    const currentOrg = await getCurrentOrg(supabase, user.id);

    return NextResponse.json({
      currentOrganizationId: currentOrg
    });

  } catch (error) {
    console.error("Error getting current organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
