import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getVehicleDocuments } from "@/lib/features/drivers/drivers.api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();
    const documents = await getVehicleDocuments(supabase, id);

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
