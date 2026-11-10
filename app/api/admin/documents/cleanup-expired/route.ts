/**
 * POST /api/admin/documents/cleanup-expired
 * Industry ops: past-expiry docs → mark status=expired OR hard-delete + storage purge.
 * Body: { mode: "preview" | "mark" | "delete", entityType?: "all"|"driver"|"vehicle" }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";

type EntityScope = "all" | "driver" | "vehicle";

async function orgEntityIds(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  orgId: string | null
) {
  if (!orgId) {
    const [{ data: drivers }, { data: vehicles }] = await Promise.all([
      admin.from("drivers").select("id"),
      admin.from("vehicles").select("id"),
    ]);
    return {
      driverIds: (drivers || []).map((d) => d.id as string),
      vehicleIds: (vehicles || []).map((v) => v.id as string),
    };
  }
  const [{ data: drivers }, { data: vehicles }] = await Promise.all([
    admin.from("drivers").select("id").eq("organization_id", orgId),
    admin.from("vehicles").select("id").eq("organization_id", orgId),
  ]);
  return {
    driverIds: (drivers || []).map((d) => d.id as string),
    vehicleIds: (vehicles || []).map((v) => v.id as string),
  };
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function purgeStorage(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  urls: Array<string | null | undefined>
) {
  let removed = 0;
  for (const url of urls) {
    if (!url) continue;
    try {
      const marker = "/storage/v1/object/public/";
      const idx = url.indexOf(marker);
      if (idx === -1) continue;
      const rest = url.slice(idx + marker.length);
      const slash = rest.indexOf("/");
      if (slash === -1) continue;
      const { error } = await admin.storage
        .from(rest.slice(0, slash))
        .remove([rest.slice(slash + 1)]);
      if (!error) removed += 1;
    } catch {
      // ignore
    }
  }
  return removed;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
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

    if (!isSuperAdmin && !currentOrgId) {
      return NextResponse.json(
        { error: "No organization context found" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      mode?: "preview" | "mark" | "delete";
      entityType?: EntityScope;
    };
    const mode = body.mode || "preview";
    const entityType: EntityScope = body.entityType || "all";
    const orgId = currentOrgId ?? null;
    const { driverIds, vehicleIds } = await orgEntityIds(admin, orgId);
    const cutoff = todayIsoDate();

    type DocRow = { id: string; file_url: string | null };
    let driverExpired: DocRow[] = [];
    let vehicleExpired: DocRow[] = [];

    if ((entityType === "all" || entityType === "driver") && driverIds.length) {
      const { data, error } = await admin
        .from("driver_documents")
        .select("id, file_url")
        .in("driver_id", driverIds)
        .not("expiry_date", "is", null)
        .lt("expiry_date", cutoff);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      driverExpired = (data || []) as DocRow[];
    }

    if ((entityType === "all" || entityType === "vehicle") && vehicleIds.length) {
      const { data, error } = await admin
        .from("vehicle_documents")
        .select("id, file_url")
        .in("vehicle_id", vehicleIds)
        .not("expiry_date", "is", null)
        .lt("expiry_date", cutoff);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      vehicleExpired = (data || []) as DocRow[];
    }

    const preview = {
      cutoff,
      driver: driverExpired.length,
      vehicle: vehicleExpired.length,
      total: driverExpired.length + vehicleExpired.length,
    };

    if (mode === "preview") {
      return NextResponse.json({ ok: true, mode, ...preview });
    }

    if (preview.total === 0) {
      return NextResponse.json({
        ok: true,
        mode,
        ...preview,
        marked: 0,
        deleted: 0,
        storageRemoved: 0,
      });
    }

    if (mode === "mark") {
      let marked = 0;
      if (driverExpired.length) {
        const { error } = await admin
          .from("driver_documents")
          .update({
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .in(
            "id",
            driverExpired.map((d) => d.id)
          );
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        marked += driverExpired.length;
      }
      if (vehicleExpired.length) {
        const { error } = await admin
          .from("vehicle_documents")
          .update({
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .in(
            "id",
            vehicleExpired.map((d) => d.id)
          );
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        marked += vehicleExpired.length;
      }
      return NextResponse.json({
        ok: true,
        mode,
        ...preview,
        marked,
        deleted: 0,
        storageRemoved: 0,
      });
    }

    if (mode === "delete") {
      let storageRemoved = 0;
      if (driverExpired.length) {
        storageRemoved += await purgeStorage(
          admin,
          driverExpired.map((d) => d.file_url)
        );
        const { error } = await admin
          .from("driver_documents")
          .delete()
          .in(
            "id",
            driverExpired.map((d) => d.id)
          );
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
      if (vehicleExpired.length) {
        storageRemoved += await purgeStorage(
          admin,
          vehicleExpired.map((d) => d.file_url)
        );
        const { error } = await admin
          .from("vehicle_documents")
          .delete()
          .in(
            "id",
            vehicleExpired.map((d) => d.id)
          );
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
      return NextResponse.json({
        ok: true,
        mode,
        ...preview,
        marked: 0,
        deleted: preview.total,
        storageRemoved,
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error) {
    console.error("[documents/cleanup-expired]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
