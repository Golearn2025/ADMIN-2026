import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  console.log("🚨 BULK ACTION API CALLED - START");
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    console.log("📥 API RECEIVED BODY:", body);
    
    const { action, document_ids, reason, document_type } = body;

    console.log("ACTION:", action);
    console.log("DOCUMENT IDs:", document_ids);
    console.log("REASON:", reason);
    console.log("DOCUMENT TYPE:", document_type);

    // Validate input
    if (!action || !document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      console.error("❌ Validation failed: missing action or document_ids");
      return NextResponse.json(
        { error: "Invalid request: action and document_ids are required" },
        { status: 400 }
      );
    }

    if (action === "reject" && !reason) {
      console.error("❌ Validation failed: missing reason for reject");
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    // Get current user (admin)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log("🔐 AUTH CHECK:");
    console.log("Auth Error:", authError);
    console.log("User Object:", user);
    console.log("User ID:", user?.id);
    console.log("User Email:", user?.email);
    
    if (!user) {
      console.error("❌ Unauthorized: no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = user.id;
    const now = new Date().toISOString();

    console.log("✅ Admin ID:", adminId);
    console.log("✅ Timestamp:", now);

    // Determine which table to update based on document_type
    const tableName = document_type === "vehicle" ? "vehicle_documents" : "driver_documents";
    console.log("Table Name:", tableName);

    if (action === "approve") {
      // Bulk approve documents
      console.log("🟢 EXECUTING APPROVE UPDATE");
      console.log("Updating table:", tableName);
      console.log("Setting status to: approved");
      console.log("For document IDs:", document_ids);
      
      const { data, error } = await supabase
        .from(tableName)
        .update({
          status: "approved",
          reviewed_at: now,
          reviewed_by: adminId,
          rejection_reason: null,
        })
        .in("id", document_ids)
        .select();

      console.log("Approve Update result - Data:", data);
      console.log("Approve Update result - Error:", error);

      if (error) {
        console.error("❌ Bulk approve error:", error);
        return NextResponse.json(
          { error: "Failed to approve documents", details: error },
          { status: 500 }
        );
      }

      console.log("✅ APPROVE SUCCESS - Updated", data?.length || 0, "documents");
      return NextResponse.json({
        success: true,
        message: `${document_ids.length} document(s) approved`,
        updated: data,
      });
    } else if (action === "reject") {
      // Bulk reject documents
      console.log("🔴 EXECUTING REJECT UPDATE");
      console.log("Updating table:", tableName);
      console.log("Setting status to: rejected");
      console.log("Setting rejection_reason to:", reason);
      console.log("For document IDs:", document_ids);
      
      const { data, error } = await supabase
        .from(tableName)
        .update({
          status: "rejected",
          rejection_reason: reason,
          reviewed_at: now,
          reviewed_by: adminId,
        })
        .in("id", document_ids)
        .select();

      console.log("Update result - Data:", data);
      console.log("Update result - Error:", error);

      if (error) {
        console.error("❌ Bulk reject error:", error);
        return NextResponse.json(
          { error: "Failed to reject documents", details: error },
          { status: 500 }
        );
      }

      console.log("✅ REJECT SUCCESS - Updated", data?.length || 0, "documents");
      return NextResponse.json({
        success: true,
        message: `${document_ids.length} document(s) rejected`,
        updated: data,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Bulk action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
