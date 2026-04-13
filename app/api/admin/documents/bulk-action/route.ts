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
      // Bulk approve documents - loop to ensure audit logging per document
      console.log("🟢 EXECUTING BULK APPROVE VIA RPC");
      console.log("Document type:", document_type);
      console.log("For document IDs:", document_ids);
      
      const rpcFunctionName = document_type === "vehicle" 
        ? "approve_vehicle_document" 
        : "approve_driver_document";
      
      const errors = [];
      let successCount = 0;

      // Loop through each document and call RPC
      for (const docId of document_ids) {
        const { error: rpcError } = await supabase.rpc(rpcFunctionName, {
          p_document_id: docId,
          p_actor_id: user.id,
        });

        if (rpcError) {
          console.error(`❌ Error approving document ${docId}:`, rpcError);
          errors.push({ docId, error: rpcError.message });
        } else {
          successCount++;
        }
      }

      console.log(`✅ APPROVE SUCCESS - ${successCount}/${document_ids.length} documents approved`);
      
      // Trigger manual realtime event since RPC doesn't trigger view updates
      console.log("🔄 Triggering manual realtime event");
      // Get driver_id from first document to trigger the event
      const { data: docData } = await supabase
        .from(tableName)
        .select('driver_id')
        .eq('id', document_ids[0])
        .single();
      
      if (docData?.driver_id) {
        // Create a simple update to trigger realtime
        await supabase
          .from('drivers')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', docData.driver_id);
        console.log("✅ Manual realtime trigger sent for driver:", docData.driver_id);
      }
      
      if (errors.length > 0) {
        console.error("❌ Some documents failed:", errors);
        return NextResponse.json(
          { 
            success: false,
            message: `${successCount}/${document_ids.length} documents approved`,
            errors 
          },
          { status: 207 } // Multi-Status
        );
      }

      return NextResponse.json({
        success: true,
        message: `${successCount} document(s) approved`,
      });
    } else if (action === "reject") {
      // Bulk reject documents - loop to ensure audit logging per document
      console.log("🔴 EXECUTING BULK REJECT VIA RPC");
      console.log("Document type:", document_type);
      console.log("Rejection reason:", reason);
      console.log("For document IDs:", document_ids);
      
      const rpcFunctionName = document_type === "vehicle" 
        ? "reject_vehicle_document" 
        : "reject_driver_document";
      
      const errors = [];
      let successCount = 0;

      // Loop through each document and call RPC
      for (const docId of document_ids) {
        const { error: rpcError } = await supabase.rpc(rpcFunctionName, {
          p_document_id: docId,
          p_rejection_reason: reason,
          p_actor_id: user.id,
        });

        if (rpcError) {
          console.error(`❌ Error rejecting document ${docId}:`, rpcError);
          errors.push({ docId, error: rpcError.message });
        } else {
          successCount++;
        }
      }

      console.log(`✅ REJECT SUCCESS - ${successCount}/${document_ids.length} documents rejected`);
      
      // Trigger manual realtime event since RPC doesn't trigger view updates
      console.log("🔄 Triggering manual realtime event");
      // Get driver_id from first document to trigger the event
      const { data: docData } = await supabase
        .from(tableName)
        .select('driver_id')
        .eq('id', document_ids[0])
        .single();
      
      if (docData?.driver_id) {
        // Create a simple update to trigger realtime
        await supabase
          .from('drivers')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', docData.driver_id);
        console.log("✅ Manual realtime trigger sent for driver:", docData.driver_id);
      }
      
      if (errors.length > 0) {
        console.error("❌ Some documents failed:", errors);
        return NextResponse.json(
          { 
            success: false,
            message: `${successCount}/${document_ids.length} documents rejected`,
            errors 
          },
          { status: 207 } // Multi-Status
        );
      }

      return NextResponse.json({
        success: true,
        message: `${successCount} document(s) rejected`,
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
