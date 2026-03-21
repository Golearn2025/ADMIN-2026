import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔥 REPLACE DOCUMENT ROUTE HIT!");
  const { id: driverId } = await params;
  console.log("Driver ID:", driverId);
  
  try {
    console.log("1. Checking access...");
    const { hasAccess } = await getUserRole();
    console.log("Has access:", hasAccess);

    if (!hasAccess) {
      console.log("❌ No access - returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("2. Getting user...");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    console.log("User:", user?.id);

    if (!user) {
      console.log("❌ No user - returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("3. Parsing formData...");
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const documentType = formData.get("documentType") as string;
    const entityType = formData.get("entityType") as "driver" | "vehicle";
    const documentId = formData.get("documentId") as string;
    
    console.log("FormData:", { 
      hasFile: !!file, 
      documentType, 
      entityType, 
      documentId 
    });

    if (!file || !documentType || !entityType || !documentId) {
      console.log("❌ Missing fields - returning 400");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    console.log("4. All validations passed, proceeding...");

    // Get current document info
    console.log("5. Fetching document from:", entityType === "driver" ? "driver_documents" : "vehicle_documents");
    const tableName = entityType === "driver" ? "driver_documents" : "vehicle_documents";
    const selectColumns = entityType === "driver" 
      ? "file_url, driver_id" 
      : "file_url, vehicle_id";
    
    const { data: currentDoc, error: fetchError } = await supabase
      .from(tableName)
      .select(selectColumns)
      .eq("id", documentId)
      .single();

    console.log("Document fetch result:", { currentDoc, fetchError });

    if (fetchError || !currentDoc) {
      console.log("❌ Document not found - returning 404");
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    
    console.log("6. Document found, proceeding with file operations...");

    // Delete old file from storage if it exists
    if (currentDoc.file_url) {
      try {
        const oldFilePath = extractStoragePath(currentDoc.file_url);
        if (oldFilePath) {
          const bucketName = entityType === "driver" ? "driver-documents" : "vehicle-documents";
          await supabase.storage.from(bucketName).remove([oldFilePath]);
        }
      } catch (error) {
        console.error("Failed to delete old file:", error);
        // Continue even if deletion fails
      }
    }

    // Upload new file
    const fileExt = file.name.split(".").pop();
    const entityId = entityType === "driver" 
      ? (currentDoc as { file_url: string; driver_id: string }).driver_id 
      : (currentDoc as { file_url: string; vehicle_id: string }).vehicle_id;
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${entityId}/${documentType}/${fileName}`;
    const bucketName = entityType === "driver" ? "driver-documents" : "vehicle-documents";

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    // Update document with new file URL and reset status to pending
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        file_url: publicUrl,
        file_name: file.name,
        status: "pending",
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update document" },
        { status: 500 }
      );
    }

    // Log to document_status_logs for activity tracking
    const { error: logError } = await supabase.from("document_status_logs").insert({
      document_id: documentId,
      entity_type: entityType,
      old_status: "approved", // Assuming replaced docs were approved
      new_status: "pending",
      reason: "Document replaced - awaiting review",
      changed_by: user.id,
    });

    if (logError) {
      console.error("Failed to log status change:", logError);
      // Don't fail the request
    }

    console.log("✅ Replace successful, returning 200");
    return NextResponse.json({ 
      success: true,
      fileUrl: publicUrl 
    });
  } catch (error) {
    console.error("❌ API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Extract storage path from Supabase public URL
 * Example: https://.../storage/v1/object/public/bucket/path/file.jpg -> path/file.jpg
 */
function extractStoragePath(url: string): string | null {
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
