import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const includeDrivers = searchParams.get("includeDrivers") === "true";
    const hasPagination =
      searchParams.has("page") || searchParams.has("pageSize");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20),
      100
    );
    const q = (searchParams.get("q") || searchParams.get("search") || "").trim();
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

    let query = supabase
      .from("admin_driver_vehicles_v4")
      .select("*", { count: "exact" });

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

    if (q) {
      const pattern = `%${q.replace(/[%_,]/g, "\\$&")}%`;
      query = query.ilike("license_plate", pattern);
    }

    query = query.order("created_at", { ascending: false });

    if (hasPagination) {
      query = query.range(offset, offset + pageSize - 1);
    }

    const { data: vehicles, error, count } = await query;

    if (error) {
      console.error("Error fetching vehicles:", error);
      return NextResponse.json(
        { error: "Failed to fetch vehicles" },
        { status: 500 }
      );
    }

    let result = vehicles;

    if (includeDrivers && vehicles && vehicles.length > 0) {
      const driverIds = vehicles
        .filter((v) => v.driver_id)
        .map((v) => v.driver_id)
        .filter(Boolean);

      if (driverIds.length > 0) {
        let driverQuery = supabase
          .from("admin_drivers_list_v4")
          .select("id, first_name, last_name, organization_id")
          .in("id", driverIds);

        if (isSuperAdmin) {
          if (currentOrgId) {
            driverQuery = driverQuery.eq("organization_id", currentOrgId);
          }
        } else {
          driverQuery = driverQuery.eq("organization_id", currentOrgId);
        }

        const { data: drivers } = await driverQuery;

        const driverMap: { [key: string]: string } = (drivers || []).reduce(
          (acc: { [key: string]: string }, driver) => {
            acc[driver.id] = `${driver.first_name} ${driver.last_name}`;
            return acc;
          },
          {}
        );

        result = result!.map((vehicle) => ({
          ...vehicle,
          driver_name: vehicle.driver_id
            ? driverMap[vehicle.driver_id] || "Unknown Driver"
            : null,
        }));
      }
    }

    if (hasPagination) {
      return NextResponse.json({
        vehicles: result || [],
        total: count || 0,
        page,
        pageSize,
      });
    }

    return NextResponse.json({ vehicles: result || [] });
  } catch (error) {
    console.error("Error in vehicles GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current organization from database (backend-controlled)
    const currentOrgId = await getCurrentOrg(supabase, user.id);

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase
      .rpc('get_user_super_admin_status', { user_id: user.id });

    // Get orgId for creation (backend-controlled)
    let orgId: string | null = null;
    
    if (isSuperAdmin) {
      // Super admin: use currentOrgId or null for ALL
      orgId = currentOrgId;
    } else {
      // Regular user: must have currentOrgId
      if (!currentOrgId) {
        return NextResponse.json({ error: "No organization context found" }, { status: 400 });
      }
      orgId = currentOrgId;
    }

    if (!orgId && !isSuperAdmin) {
      return NextResponse.json({ error: "Organization required" }, { status: 400 });
    }

    const body = await request.json();

    const {
      license_plate,
      model_id,
      year,
      color_id,
      driver_id,
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

    // Validate vehicle model from catalog (not from existing vehicles view)
    const { data: modelCheck, error: modelError } = await supabase
      .from("vehicle_model_catalog")
      .select("id, category_id")
      .eq("id", model_id)
      .single();

    if (modelError || !modelCheck) {
      return NextResponse.json(
        { error: "Invalid vehicle model" },
        { status: 400 }
      );
    }

    // Check if license plate already exists
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('license_plate', license_plate.toUpperCase())
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single();

    if (existingVehicle) {
      return NextResponse.json(
        { error: "License plate already exists" },
        { status: 400 }
      );
    }

    // Create vehicle
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .insert({
        organization_id: orgId,
        license_plate: license_plate.toUpperCase(),
        model_id,
        year,
        color_id,
        driver_id: driver_id || null,
        category_id: modelCheck.category_id,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      return NextResponse.json(
        { error: "Failed to create vehicle" },
        { status: 500 }
      );
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Error in vehicles POST:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
