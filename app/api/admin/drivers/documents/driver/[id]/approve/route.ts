import { getUserRole } from "@/lib/auth/roles";
import { approveDriverDocument } from "@/lib/features/drivers/drivers.api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reviewed_by } = body;

    if (!reviewed_by) {
      return NextResponse.json(
        { error: "reviewed_by is required" },
        { status: 400 }
      );
    }

    const document = await approveDriverDocument(params.id, reviewed_by);

    return NextResponse.json({ document });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
