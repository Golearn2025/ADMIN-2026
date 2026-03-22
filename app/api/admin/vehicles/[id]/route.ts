import { NextRequest, NextResponse } from "next/server";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { id } = params;
    const body = await request.json();

    const {
      license_plate,
      model_id,
      year,
      color_id,
      status,
      status_reason,
      allowed_categories,
    } = body;

    // Validate required fields
    if (!license_plate || !model_id || !year || !color_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate year (max 3 years old per store rules)
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 3; // 2026 - 3 = 2023
    
    if (year < minYear || year > currentYear) {
      return NextResponse.json(
        { error: `Year must be between ${minYear} and ${currentYear} (max 3 years old)` },
        { status: 400 }
      );
    }

    // Get vehicle model to determine category
    const { data: model, error: modelError } = await supabase
      .from('vehicle_model_catalog')
      .select('category_id')
      .eq('id', model_id)
      .single();

    if (modelError || !model) {
      return NextResponse.json(
        { error: "Invalid vehicle model" },
        { status: 400 }
      );
    }

    // Update vehicle
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .update({
        license_plate,
        model_id,
        year,
        color_id,
        status,
        status_reason,
        allowed_categories,
        category_id: model.category_id, // Update category based on model
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      return NextResponse.json(
        { error: "Failed to update vehicle" },
        { status: 500 }
      );
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Error in vehicle PATCH:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
