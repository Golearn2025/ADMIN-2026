import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const includeDrivers = searchParams.get('includeDrivers') === 'true';

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

    // Base query from VIEW - SINGLE SOURCE OF TRUTH
    let query = supabase
      .from('admin_driver_vehicles_v4')
      .select('*');

    // Backend-controlled filtering
    // Super admin with specific org selected: filter by that org
    // Super admin with NULL org (ALL): no filter
    // Normal user: always filter by their org
    if (isSuperAdmin) {
      // Super admin: filter only if org is selected
      if (currentOrgId) {
        query = query.eq("organization_id", currentOrgId);
      }
      // If currentOrgId is NULL, no filter (see ALL)
    } else {
      // Normal user: must have org context
      if (!currentOrgId) {
        return NextResponse.json({ error: "No organization context found" }, { status: 400 });
      }
      query = query.eq("organization_id", currentOrgId);
    }

    query = query.order('created_at', { ascending: false });

    const { data: vehicles, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 });
    }

    let result = vehicles;

    // If includeDrivers is requested, fetch driver info from VIEW
    if (includeDrivers && vehicles && vehicles.length > 0) {
      const driverIds = vehicles
        .filter(v => v.driver_id)
        .map(v => v.driver_id)
        .filter(Boolean);

      if (driverIds.length > 0) {
        // Use admin_drivers_list_v4 for driver info - SINGLE SOURCE OF TRUTH
        let driverQuery = supabase
          .from('admin_drivers_list_v4')
          .select('id, first_name, last_name, organization_id')
          .in('id', driverIds);

        // Apply organization filter for drivers too (backend-controlled)
        if (isSuperAdmin) {
          if (currentOrgId) {
            driverQuery = driverQuery.eq('organization_id', currentOrgId);
          }
        } else {
          driverQuery = driverQuery.eq('organization_id', currentOrgId);
        }

        const { data: drivers } = await driverQuery;

        const driverMap: { [key: string]: string } = (drivers || []).reduce((acc: { [key: string]: string }, driver) => {
          acc[driver.id] = `${driver.first_name} ${driver.last_name}`;
          return acc;
        }, {});

        result = result.map(vehicle => ({
          ...vehicle,
          driver_name: vehicle.driver_id ? driverMap[vehicle.driver_id] || 'Unknown Driver' : null
        }));
      }
    }

    return NextResponse.json({ vehicles: result || [] });
  } catch (error) {
    console.error('Error in vehicles GET:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    // Validate vehicle model exists in admin_driver_vehicles_v4
    const { data: modelCheck, error: modelError } = await supabase
      .from('admin_driver_vehicles_v4')
      .select('model_id, category_id')
      .eq('model_id', model_id)
      .limit(1)
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
        status: 'available',
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
