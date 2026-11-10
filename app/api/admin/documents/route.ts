import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType"); // driver | vehicle | all
    const status = searchParams.get("status");
    const driverId = searchParams.get("driverId");
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(
      Math.max(5, Number(searchParams.get("pageSize") || 20)),
      100
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

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

    let orgId: string | null = null;
    if (isSuperAdmin) {
      orgId = currentOrgId;
    } else {
      if (!currentOrgId) {
        return NextResponse.json(
          { error: "No organization context found" },
          { status: 400 }
        );
      }
      orgId = currentOrgId;
    }

    let driverIds: string[] = [];
    let vehicleIds: string[] = [];

    if (orgId) {
      const [{ data: orgDrivers }, { data: orgVehicles }] = await Promise.all([
        supabase.from("drivers").select("id").eq("organization_id", orgId),
        supabase.from("vehicles").select("id").eq("organization_id", orgId),
      ]);
      driverIds = orgDrivers?.map((d) => d.id) || [];
      vehicleIds = orgVehicles?.map((v) => v.id) || [];
    } else {
      const [{ data: allDrivers }, { data: allVehicles }] = await Promise.all([
        supabase.from("drivers").select("id"),
        supabase.from("vehicles").select("id"),
      ]);
      driverIds = allDrivers?.map((d) => d.id) || [];
      vehicleIds = allVehicles?.map((v) => v.id) || [];
    }

    let query = supabase
      .from("admin_driver_documents_with_reviewer_v4_fix")
      .select("*", { count: "exact" });

    if (driverId) {
      query = query.eq("driver_id", driverId);
    } else if (driverIds.length > 0 && vehicleIds.length > 0) {
      query = query.or(
        `driver_id.in.(${driverIds.join(",")}),vehicle_id.in.(${vehicleIds.join(",")})`
      );
    } else if (driverIds.length > 0) {
      query = query.in("driver_id", driverIds);
    } else if (vehicleIds.length > 0) {
      query = query.in("vehicle_id", vehicleIds);
    } else {
      query = query.is("driver_id", null).is("vehicle_id", null);
    }

    if (entityType && entityType !== "all") {
      query = query.eq("entity_type", entityType);
    }
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data: documents, error, count } = await query;
    if (error) {
      console.error("Error fetching documents:", error);
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }

    if (!documents?.length) {
      return NextResponse.json({
        documents: [],
        total: count ?? 0,
        page,
        pageSize,
      });
    }

    // Enrich with admin client — user RLS often hides other drivers' names
    const admin = createAdminClient() ?? supabase;

    const enrichDriverIds = [
      ...new Set(
        documents.filter((d) => d.driver_id).map((d) => d.driver_id as string)
      ),
    ];
    const enrichVehicleIds = [
      ...new Set(
        documents.filter((d) => d.vehicle_id).map((d) => d.vehicle_id as string)
      ),
    ];

    type DriverContact = {
      name: string;
      phone: string | null;
      email: string | null;
    };
    type VehicleInfo = {
      plate: string;
      model: string | null;
      year: number | null;
      driver_id: string | null;
    };

    const prettyModelId = (id: string | null | undefined) => {
      if (!id) return null;
      return id
        .split(/[-_]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    };

    const driverMap: Record<string, DriverContact> = {};
    const vehicleById: Record<string, VehicleInfo> = {};
    const vehicleIdByDriver: Record<string, string> = {};

    const upsertDrivers = (
      rows: Array<{
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        phone?: string | null;
        email?: string | null;
      }>
    ) => {
      for (const driver of rows) {
        driverMap[driver.id] = {
          name:
            `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
            "Unknown Driver",
          phone: (driver.phone || "").trim() || null,
          email: (driver.email || "").trim() || null,
        };
      }
    };

    const upsertVehicles = async (
      rows: Array<{
        id: string;
        license_plate?: string | null;
        make?: string | null;
        model?: string | null;
        model_id?: string | null;
        year?: number | null;
        driver_id?: string | null;
      }>
    ) => {
      const modelIds = [
        ...new Set(
          rows.map((v) => v.model_id).filter((id): id is string => Boolean(id))
        ),
      ];
      const catalogLabels: Record<string, string> = {};
      if (modelIds.length > 0) {
        const { data: catalog } = await admin
          .from("vehicle_model_catalog")
          .select("id, label")
          .in("id", modelIds);
        for (const row of catalog || []) {
          catalogLabels[row.id] = row.label;
        }
      }

      for (const vehicle of rows) {
        const fromCols = [vehicle.make, vehicle.model]
          .filter(Boolean)
          .join(" ")
          .trim();
        const modelLabel =
          fromCols ||
          catalogLabels[vehicle.model_id || ""] ||
          prettyModelId(vehicle.model_id) ||
          null;
        vehicleById[vehicle.id] = {
          plate: (vehicle.license_plate || "").trim() || "No plate",
          model: modelLabel,
          year: vehicle.year ?? null,
          driver_id: (vehicle.driver_id as string | null) || null,
        };
        if (vehicle.driver_id && !vehicleIdByDriver[vehicle.driver_id]) {
          vehicleIdByDriver[vehicle.driver_id as string] = vehicle.id;
        }
      }
    };

    if (enrichDriverIds.length > 0) {
      const { data: drivers } = await admin
        .from("drivers")
        .select("id, first_name, last_name, phone, email")
        .in("id", enrichDriverIds);
      upsertDrivers(drivers || []);
    }

    if (enrichVehicleIds.length > 0) {
      const { data: vehicles } = await admin
        .from("vehicles")
        .select("id, license_plate, make, model, model_id, year, driver_id")
        .in("id", enrichVehicleIds);
      await upsertVehicles(vehicles || []);
    }

    // Driver docs often lack vehicle_id — resolve assigned vehicle for Contact/Vehicle columns
    const driversNeedingVehicle = enrichDriverIds.filter(
      (id) => !vehicleIdByDriver[id]
    );
    if (driversNeedingVehicle.length > 0) {
      const { data: driverVehicles } = await admin
        .from("vehicles")
        .select("id, license_plate, make, model, model_id, year, driver_id")
        .in("driver_id", driversNeedingVehicle)
        .is("deleted_at", null);
      await upsertVehicles(driverVehicles || []);
    }

    // Vehicle rows may omit driver_id on the doc — fall back to vehicle.driver_id
    const missingDriverIds = [
      ...new Set(
        Object.values(vehicleById)
          .map((v) => v.driver_id)
          .filter((id): id is string => typeof id === "string" && !driverMap[id])
      ),
    ];
    if (missingDriverIds.length > 0) {
      const { data: moreDrivers } = await admin
        .from("drivers")
        .select("id, first_name, last_name, phone, email")
        .in("id", missingDriverIds);
      upsertDrivers(moreDrivers || []);
    }

    let enriched = documents.map((doc) => {
      const vehicleIdFromDoc = (doc.vehicle_id as string | null) || null;
      const vehicleFromDoc = vehicleIdFromDoc
        ? vehicleById[vehicleIdFromDoc]
        : null;

      const resolvedDriverId =
        (doc.driver_id as string | null) ||
        vehicleFromDoc?.driver_id ||
        null;

      const resolvedVehicleId =
        vehicleIdFromDoc ||
        (resolvedDriverId ? vehicleIdByDriver[resolvedDriverId] || null : null);

      const vehicle = resolvedVehicleId
        ? vehicleById[resolvedVehicleId]
        : null;
      const contact = resolvedDriverId ? driverMap[resolvedDriverId] : null;

      const plate = vehicle?.plate || null;
      const modelLabel = vehicle?.model || null;
      const year = vehicle?.year ?? null;
      const vehicleLabel = plate
        ? [plate, modelLabel, year != null ? String(year) : null]
            .filter(Boolean)
            .join(" · ")
        : null;

      return {
        ...doc,
        driver_id: resolvedDriverId || doc.driver_id,
        vehicle_id: resolvedVehicleId || doc.vehicle_id,
        driver_name: contact?.name || null,
        driver_phone: contact?.phone || null,
        driver_email: contact?.email || null,
        vehicle_plate: plate,
        vehicle_model: modelLabel,
        vehicle_year: year,
        vehicle_info: vehicleLabel,
        vehicle_license: vehicleLabel,
      };
    });

    if (q) {
      const needle = q.toLowerCase();
      enriched = enriched.filter(
        (doc) =>
          doc.driver_name?.toLowerCase().includes(needle) ||
          doc.driver_phone?.toLowerCase().includes(needle) ||
          doc.driver_email?.toLowerCase().includes(needle) ||
          doc.vehicle_plate?.toLowerCase().includes(needle) ||
          doc.vehicle_model?.toLowerCase().includes(needle) ||
          doc.vehicle_license?.toLowerCase().includes(needle) ||
          (doc.vehicle_year != null &&
            String(doc.vehicle_year).includes(needle)) ||
          String(doc.document_type || "")
            .toLowerCase()
            .includes(needle)
      );
    }

    return NextResponse.json({
      documents: enriched,
      total: count ?? enriched.length,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Error in documents GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Soft-delete / remove document rows (driver or vehicle). */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      document_ids?: string[];
      document_type?: "driver" | "vehicle";
    };

    if (
      !body.document_ids?.length ||
      (body.document_type !== "driver" && body.document_type !== "vehicle")
    ) {
      return NextResponse.json(
        { error: "document_ids and document_type are required" },
        { status: 400 }
      );
    }

    const tableName =
      body.document_type === "vehicle" ? "vehicle_documents" : "driver_documents";
    const admin = createAdminClient() ?? supabase;

    const { data: rows } = await admin
      .from(tableName)
      .select("id, file_url")
      .in("id", body.document_ids);

    const { error } = await admin.from(tableName).delete().in("id", body.document_ids);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Best-effort storage cleanup
    for (const row of rows || []) {
      const url = row.file_url as string | null;
      if (!url) continue;
      try {
        const marker = "/storage/v1/object/public/";
        const idx = url.indexOf(marker);
        if (idx === -1) continue;
        const rest = url.slice(idx + marker.length);
        const slash = rest.indexOf("/");
        if (slash === -1) continue;
        const bucket = rest.slice(0, slash);
        const path = rest.slice(slash + 1);
        await admin.storage.from(bucket).remove([path]);
      } catch {
        // ignore storage cleanup errors
      }
    }

    return NextResponse.json({
      ok: true,
      deleted: body.document_ids.length,
    });
  } catch (error) {
    console.error("Error in documents DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
