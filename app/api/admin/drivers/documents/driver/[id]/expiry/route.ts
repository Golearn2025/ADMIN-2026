import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function parseExpiryDate(value: unknown): string | null | "invalid" {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "invalid";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "invalid";
  return value;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const expiryDate = parseExpiryDate(body.expiry_date);

    if (expiryDate === "invalid") {
      return NextResponse.json(
        { error: "expiry_date must be YYYY-MM-DD or null" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: updateError } = await supabase
      .from("driver_documents")
      .update({
        expiry_date: expiryDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update expiry date" },
        { status: 500 }
      );
    }

    const { data: document, error } = await supabase
      .from("driver_documents")
      .select()
      .eq("id", id)
      .single();

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch updated document" },
        { status: 500 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
