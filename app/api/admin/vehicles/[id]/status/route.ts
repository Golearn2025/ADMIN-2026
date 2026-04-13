import { NextRequest, NextResponse } from "next/server";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    const { status, status_reason } = body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'maintenance', 'suspended'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Validate status reason for suspended/inactive
    if ((status === 'suspended' || status === 'inactive') && !status_reason) {
      return NextResponse.json(
        { error: "Status reason is required for suspended/inactive status" },
        { status: 400 }
      );
    }

    // Update vehicle status
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .update({
        status,
        status_reason: status_reason || null,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle status:', error);
      return NextResponse.json(
        { error: "Failed to update vehicle status" },
        { status: 500 }
      );
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Error in vehicle status PATCH:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
