import { getUserRole } from "@/lib/auth/roles";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { orgId, hasAccess } = await getUserRole();

    if (!hasAccess || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({ organizationId: orgId });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
