import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { rejectVehicleDocument } from "@/lib/features/drivers/drivers.api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reviewed_by, reason } = body;

    if (!reviewed_by || !reason) {
      return NextResponse.json(
        { error: "reviewed_by and reason are required" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const supabase = await createClient();
    const document = await rejectVehicleDocument(supabase, id, reviewed_by, reason);

    return NextResponse.json({ document });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
