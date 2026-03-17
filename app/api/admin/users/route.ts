import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { orgId } = await getUserRole();

    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized - no organization" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "";

    const offset = (page - 1) * pageSize;

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
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    // Add role filter
    if (roleFilter) {
      query = query.eq("role", roleFilter);
    }

    // Add pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

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
