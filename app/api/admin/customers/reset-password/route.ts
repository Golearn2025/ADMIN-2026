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

    const customerId =
      typeof body.customer_id === "string" ? body.customer_id.trim() : "";
    if (!customerId) {
      return NextResponse.json(
        { error: "customer_id is required" },
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

    const { data: customer, error: customerError } = await admin
      .from("customers")
      .select("id, email, auth_user_id, organization_id")
      .eq("id", customerId)
      .eq("organization_id", currentOrgId)
      .is("deleted_at", null)
      .maybeSingle();

    if (customerError) {
      console.error("[customers reset-password]", customerError);
      return NextResponse.json(
        { error: "Failed to load customer" },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (!customer.auth_user_id) {
      return NextResponse.json(
        { error: "Customer has no login account" },
        { status: 400 }
      );
    }

    let email = customer.email;
    if (!email) {
      const { data: userData, error: userError } =
        await admin.auth.admin.getUserById(customer.auth_user_id);
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

    return NextResponse.json({ action_link: actionLink });
  } catch (error) {
    console.error("[customers reset-password]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
