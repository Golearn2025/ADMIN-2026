import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "";

    const offset = (page - 1) * pageSize;

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

    // Query organization_members with auth.users data
    let query = supabase
      .from("organization_members")
      .select(
        `
        id,
        user_id,
        role,
        created_at,
        organization_id
      `,
        { count: "exact" }
      );

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
    query = query.order("created_at", { ascending: false });

    // Add role filter
    if (roleFilter) {
      query = query.eq("role", roleFilter);
    }

    // Add pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    console.log('👥 USERS API DEBUG (Backend-Controlled):');
    console.log('   userId:', user.id);
    console.log('   currentOrgId (from DB):', currentOrgId);
    console.log('   isSuperAdmin:', !!isSuperAdmin);
    console.log('   users returned:', data?.length || 0);

    if (error) {
      console.error("Supabase error:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: "Failed to fetch users", details: error.message },
        { status: 500 }
      );
    }

    // Fetch user details from auth.users for each member
    const usersWithDetails = await Promise.all(
      (data || []).map(async (member) => {
        const { data: userData } = await supabase.auth.admin.getUserById(
          member.user_id
        );

        return {
          id: member.id,
          user_id: member.user_id,
          email: userData?.user?.email || "N/A",
          role: member.role,
          created_at: member.created_at,
          last_sign_in_at: userData?.user?.last_sign_in_at || null,
        };
      })
    );

    return NextResponse.json({
      data: usersWithDetails,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
