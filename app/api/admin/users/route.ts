import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";

const INVITE_ROLES = ["admin", "owner", "operator", "member"] as const;
type InviteRole = (typeof INVITE_ROLES)[number];

function isInviteRole(role: unknown): role is InviteRole {
  return typeof role === "string" && (INVITE_ROLES as readonly string[]).includes(role);
}

async function enrichMembers(
  members: Array<{
    id: string;
    user_id: string;
    role: string;
    created_at: string | null;
  }>,
  admin: NonNullable<ReturnType<typeof createAdminClient>> | null
) {
  return Promise.all(
    (members || []).map(async (member) => {
      let email = "N/A";
      let lastSignIn: string | null = null;
      if (admin) {
        const { data: userData } = await admin.auth.admin.getUserById(
          member.user_id
        );
        email = userData?.user?.email || "N/A";
        lastSignIn = userData?.user?.last_sign_in_at || null;
      }

      return {
        id: member.id,
        user_id: member.user_id,
        email,
        role: member.role,
        created_at: member.created_at,
        last_sign_in_at: lastSignIn,
      };
    })
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const roleFilter = searchParams.get("role") || "";

    const offset = (page - 1) * pageSize;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrgId = await getCurrentOrg(supabase, user.id);

    const { data: isSuperAdmin } = await supabase.rpc(
      "get_user_super_admin_status",
      { user_id: user.id }
    );

    let query = supabase.from("organization_members").select(
      `
        id,
        user_id,
        role,
        created_at,
        organization_id
      `,
      { count: "exact" }
    );

    if (isSuperAdmin) {
      if (currentOrgId) {
        query = query.eq("organization_id", currentOrgId);
      }
    } else {
      if (!currentOrgId) {
        return NextResponse.json(
          { error: "No organization context found" },
          { status: 400 }
        );
      }
      query = query.eq("organization_id", currentOrgId);
    }
    query = query.order("created_at", { ascending: false });

    if (roleFilter) {
      query = query.eq("role", roleFilter);
    }

    // When searching by email we must enrich first, then filter + paginate in memory
    if (!search) {
      query = query.range(offset, offset + pageSize - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase error:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: "Failed to fetch users", details: error.message },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    const usersWithDetails = await enrichMembers(data || [], admin);

    if (search) {
      const filtered = usersWithDetails.filter((m) =>
        (m.email || "").toLowerCase().includes(search)
      );
      const paged = filtered.slice(offset, offset + pageSize);
      return NextResponse.json({
        data: paged,
        total: filtered.length,
        page,
        pageSize,
      });
    }

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrgId = await getCurrentOrg(supabase, user.id);
    if (!currentOrgId) {
      return NextResponse.json(
        { error: "No organization context found" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = body.role;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 }
      );
    }

    if (!isInviteRole(role)) {
      return NextResponse.json(
        { error: "role must be admin|owner|operator|member" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server misconfiguration: admin client unavailable" },
        { status: 500 }
      );
    }

    const redirectTo = `${request.nextUrl.origin}/login`;
    let userId: string | null = null;
    let inviteWarning: string | null = null;

    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (!inviteError && invited?.user?.id) {
      userId = invited.user.id;
    } else {
      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email,
          email_confirm: true,
        });

      if (!createError && created?.user?.id) {
        userId = created.user.id;
        const { error: linkError } = await admin.auth.admin.generateLink({
          type: "invite",
          email,
          options: { redirectTo },
        });
        if (linkError) {
          inviteWarning = linkError.message;
        }
      } else {
        // User likely already exists — resolve id via generateLink
        const { data: linkData, error: linkError } =
          await admin.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo },
          });

        if (linkError || !linkData?.user?.id) {
          return NextResponse.json(
            {
              error:
                inviteError?.message ||
                createError?.message ||
                linkError?.message ||
                "Failed to invite user",
            },
            { status: 400 }
          );
        }
        userId = linkData.user.id;
        inviteWarning =
          inviteError?.message ||
          createError?.message ||
          "User already existed; membership updated";
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Failed to resolve invited user" },
        { status: 500 }
      );
    }

    const { data: existingMember } = await admin
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", currentOrgId)
      .eq("user_id", userId)
      .maybeSingle();

    let memberRow: { id: string; role: string; user_id: string } | null = null;

    if (existingMember?.id) {
      const { data: updated, error: updateError } = await admin
        .from("organization_members")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", existingMember.id)
        .eq("organization_id", currentOrgId)
        .select("id, role, user_id")
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update organization member", details: updateError.message },
          { status: 500 }
        );
      }
      memberRow = updated;
    } else {
      const { data: inserted, error: insertError } = await admin
        .from("organization_members")
        .insert({
          organization_id: currentOrgId,
          user_id: userId,
          role,
        })
        .select("id, role, user_id")
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to add organization member", details: insertError.message },
          { status: 500 }
        );
      }
      memberRow = inserted;
    }

    return NextResponse.json({
      data: {
        id: memberRow?.id,
        user_id: userId,
        email,
        role: memberRow?.role ?? role,
      },
      ...(inviteWarning ? { warning: inviteWarning } : {}),
    });
  } catch (error) {
    console.error("Invite API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
