import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Upload a new (or replace-by-type) driver/vehicle document from All Documents.
 * FormData: file, documentType, entityType (driver|vehicle), driverId?, vehicleId?
 */
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = String(formData.get("documentType") || "");
    const entityType = String(formData.get("entityType") || "") as
      | "driver"
      | "vehicle";
    const driverId = (formData.get("driverId") as string) || null;
    const vehicleId = (formData.get("vehicleId") as string) || null;
    const documentId = (formData.get("documentId") as string) || null;

    if (!file || !documentType || !entityType) {
      return NextResponse.json(
        { error: "file, documentType and entityType are required" },
        { status: 400 }
      );
    }
    if (!documentId) {
      if (entityType === "driver" && !driverId) {
        return NextResponse.json({ error: "driverId required" }, { status: 400 });
      }
      if (entityType === "vehicle" && !vehicleId) {
        return NextResponse.json({ error: "vehicleId required" }, { status: 400 });
      }
    }

    const admin = createAdminClient() ?? supabase;
    const bucket = entityType === "driver" ? "driver-documents" : "vehicle-documents";
    const table =
      entityType === "driver" ? "driver_documents" : "vehicle_documents";

    let ownerId = entityType === "driver" ? driverId : vehicleId;
    let existingId = documentId;

    if (documentId) {
      const { data: current } = await admin
        .from(table)
        .select("id, file_url, driver_id, vehicle_id")
        .eq("id", documentId)
        .maybeSingle();
      if (!current) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      existingId = current.id;
      ownerId =
        entityType === "driver"
          ? (current as { driver_id?: string }).driver_id || driverId
          : (current as { vehicle_id?: string }).vehicle_id || vehicleId;

      // Best-effort remove old storage object
      const oldUrl = (current as { file_url?: string | null }).file_url;
      if (oldUrl) {
        try {
          const marker = "/storage/v1/object/public/";
          const idx = oldUrl.indexOf(marker);
          if (idx !== -1) {
            const rest = oldUrl.slice(idx + marker.length);
            const slash = rest.indexOf("/");
            if (slash !== -1) {
              await admin.storage
                .from(rest.slice(0, slash))
                .remove([rest.slice(slash + 1)]);
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (!ownerId) {
      return NextResponse.json(
        { error: "Could not resolve owner id for upload path" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "bin";
    const filePath = `${ownerId}/${documentType}/${Date.now()}.${ext}`;

    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(filePath, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      // fallback bucket name used in replace-document
      const altBucket = "documents";
      const retry = await admin.storage.from(altBucket).upload(filePath, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });
      if (retry.error) {
        return NextResponse.json(
          { error: uploadError.message || retry.error.message },
          { status: 500 }
        );
      }
    }

    const usedBucket = uploadError ? "documents" : bucket;
    const { data: pub } = admin.storage.from(usedBucket).getPublicUrl(filePath);
    const fileUrl = pub.publicUrl;

    if (existingId) {
      const { error } = await admin
        .from(table)
        .update({
          file_url: fileUrl,
          status: "pending",
          rejection_reason: null,
          reviewed_at: null,
          reviewed_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, id: existingId, replaced: true });
    }

    // Upsert by owner + type if a row exists
    let existingQuery = admin
      .from(table)
      .select("id")
      .eq("document_type", documentType)
      .limit(1);
    existingQuery =
      entityType === "driver"
        ? existingQuery.eq("driver_id", driverId!)
        : existingQuery.eq("vehicle_id", vehicleId!);

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing?.id) {
      const { error } = await admin
        .from(table)
        .update({
          file_url: fileUrl,
          status: "pending",
          rejection_reason: null,
          reviewed_at: null,
          reviewed_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, id: existing.id, replaced: true });
    }

    const insertPayload =
      entityType === "driver"
        ? {
            driver_id: driverId,
            document_type: documentType,
            file_url: fileUrl,
            status: "pending",
          }
        : {
            vehicle_id: vehicleId,
            document_type: documentType,
            file_url: fileUrl,
            status: "pending",
          };

    const { data: inserted, error: insertError } = await admin
      .from(table)
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: inserted.id, replaced: false });
  } catch (error) {
    console.error("[documents/upload]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
