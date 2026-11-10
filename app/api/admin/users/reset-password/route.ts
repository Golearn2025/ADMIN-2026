import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";

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

    const userId =
      typeof body.userId === "string" ? body.userId.trim() : "";
    const emailInput =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!userId && !emailInput) {
      return NextResponse.json(
        { error: "userId or email is required" },
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

    let email = emailInput;

    if (userId) {
      // Ensure target user belongs to current org
      const { data: membership } = await admin
        .from("organization_members")
        .select("id")
        .eq("organization_id", currentOrgId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json(
          { error: "User is not a member of the current organization" },
          { status: 404 }
        );
      }

      if (!email) {
        const { data: userData, error: userError } =
          await admin.auth.admin.getUserById(userId);
        if (userError || !userData?.user?.email) {
          return NextResponse.json(
            {
              error: userError?.message || "Could not resolve user email",
            },
            { status: 400 }
          );
        }
        email = userData.user.email;
      }
    }

    const redirectTo = `${request.nextUrl.origin}/login`;
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

    if (linkError) {
      return NextResponse.json(
        { error: linkError.message || "Failed to generate recovery link" },
        { status: 400 }
      );
    }

    const actionLink =
      linkData?.properties?.action_link ||
      (linkData as { action_link?: string } | null)?.action_link ||
      null;

    if (!actionLink) {
      return NextResponse.json(
        { error: "Recovery link was not returned by auth admin" },
        { status: 500 }
      );
    }

    // Return link for UI copy — do not send email when generateLink provides the link
    return NextResponse.json({ action_link: actionLink });
  } catch (error) {
    console.error("[users reset-password]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
