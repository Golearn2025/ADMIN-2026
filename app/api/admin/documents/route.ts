import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType'); // 'driver' or 'vehicle' or 'all'

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current organization from database
    const currentOrgId = await getCurrentOrg(supabase, user.id);

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase
      .rpc('get_user_super_admin_status', { user_id: user.id });

    // Determine which organization to filter by
    let orgId = null;
    if (isSuperAdmin) {
      // Super admin: use currentOrgId if set, otherwise null (ALL)
      orgId = currentOrgId;
    } else {
      // Normal user: must have org context
      if (!currentOrgId) {
        return NextResponse.json({ error: "No organization context found" }, { status: 400 });
      }
      orgId = currentOrgId;
    }

    // Get org drivers and vehicles for filtering
    let driverIds: string[] = [];
    let vehicleIds: string[] = [];

    if (orgId) {
      const { data: orgDrivers } = await supabase
        .from('drivers')
        .select('id')
        .eq('organization_id', orgId);
      
      const { data: orgVehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('organization_id', orgId);

      driverIds = orgDrivers?.map(d => d.id) || [];
      vehicleIds = orgVehicles?.map(v => v.id) || [];
    } else {
      // Super admin with ALL - get all drivers and vehicles
      const { data: allDrivers } = await supabase
        .from('drivers')
        .select('id');
      
      const { data: allVehicles } = await supabase
        .from('vehicles')
        .select('id');

      driverIds = allDrivers?.map(d => d.id) || [];
      vehicleIds = allVehicles?.map(v => v.id) || [];
    }

    // Base query from VIEW
    let query = supabase
      .from('admin_driver_documents_with_reviewer_v4_fix')
      .select('*');

    // Filter by org entities
    if (driverIds.length > 0 && vehicleIds.length > 0) {
      query = query.or(`driver_id.in.(${driverIds.join(',')}),vehicle_id.in.(${vehicleIds.join(',')})`);
    } else if (driverIds.length > 0) {
      query = query.in('driver_id', driverIds);
    } else if (vehicleIds.length > 0) {
      query = query.in('vehicle_id', vehicleIds);
    } else {
      query = query.is('driver_id', null).is('vehicle_id', null);
    }

    query = query.order('created_at', { ascending: false });

    // Filter by entity type if specified
    if (entityType && entityType !== 'all') {
      query = query.eq('entity_type', entityType);
    }

    const { data: documents, error } = await query;

    console.log('📋 DOCUMENTS API DEBUG:');
    console.log('   isSuperAdmin:', isSuperAdmin);
    console.log('   currentOrgId:', currentOrgId);
    console.log('   orgId (filtering):', orgId);
    console.log('   documents count:', documents?.length || 0);
    console.log('   error:', error);

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }

    // Adăugăm nume pentru display
    if (documents && documents.length > 0) {
      const driverIds = [...new Set(documents.filter(d => d.driver_id).map(d => d.driver_id))];
      const vehicleIds = [...new Set(documents.filter(d => d.vehicle_id).map(d => d.vehicle_id))];

      let driverMap: Record<string, string> = {};
      let vehicleMap: Record<string, string> = {};

      // Fetch driver names
      if (driverIds.length > 0) {
        let driverQuery = supabase
          .from('drivers')
          .select('id, first_name, last_name')
          .in('id', driverIds)
          .is('deleted_at', null);

        // Apply organization filter for drivers too
        if (orgId) {
          driverQuery = driverQuery.eq('organization_id', orgId);
        }

        const { data: drivers } = await driverQuery;

        driverMap = (drivers || []).reduce((acc: Record<string, string>, driver) => {
          acc[driver.id] = `${driver.first_name} ${driver.last_name}`;
          return acc;
        }, {});
      }

      // Fetch vehicle info
      if (vehicleIds.length > 0) {
        let vehicleQuery = supabase
          .from('vehicles')
          .select('id, license_plate, make, model')
          .in('id', vehicleIds)
          .is('deleted_at', null);

        // Apply organization filter for vehicles too
        if (orgId) {
          vehicleQuery = vehicleQuery.eq('organization_id', orgId);
        }

        const { data: vehicles } = await vehicleQuery;

        vehicleMap = (vehicles || []).reduce((acc: Record<string, string>, vehicle) => {
          acc[vehicle.id] = `${vehicle.license_plate} (${vehicle.make} ${vehicle.model})`;
          return acc;
        }, {});
      }

      // Enrich documents
      const enrichedDocuments = documents.map(doc => ({
        ...doc,
        driver_name: doc.driver_id ? driverMap[doc.driver_id] || 'Unknown Driver' : null,
        vehicle_info: doc.vehicle_id ? vehicleMap[doc.vehicle_id] || 'Unknown Vehicle' : null
      }));

      return NextResponse.json({ documents: enrichedDocuments });
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (error) {
    console.error('Error in documents GET:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
