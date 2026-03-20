// ============================================================================
// DRIVERS API LAYER - SERVER-SIDE ONLY
// ============================================================================
// NO business logic here - pure data access only
// IMPORTANT: This file is for SERVER-SIDE API routes ONLY
// Do NOT import this in client components

import type {
  Driver,
  DriverDocument,
  VehicleDocument,
  DocumentStatusLog,
  DocumentUpdatePayload,
} from "./drivers.types";

// ============================================================================
// DRIVERS LIST
// ============================================================================

export async function getDrivers(
  supabase: any, 
  organizationId: string
) {
  // Single query to enterprise view - NO filters, NO calculations
  const { data, error } = await supabase
    .from("admin_driver_overview_v2")
    .select("*")
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching drivers:", error);
    throw new Error(error.message);
  }

  return data as Driver[];
}

// ============================================================================
// DRIVER DETAIL
// ============================================================================

export async function getDriverById(supabase: any, driverId: string) {

  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", driverId)
    .single();

  if (error) {
    console.error("Error fetching driver:", error);
    throw new Error(error.message);
  }

  return data;
}

// ============================================================================
// DRIVER DOCUMENTS
// ============================================================================

export async function getDriverDocuments(supabase: any, driverId: string) {

  const { data, error } = await supabase
    .from("admin_driver_documents_with_reviewer_v4_fix")
    .select("*")
    .eq("driver_id", driverId)
    .eq("entity_type", "driver")
    .order("document_type", { ascending: true });

  if (error) {
    console.error("Error fetching driver documents:", error);
    throw new Error(error.message);
  }

  return data as DriverDocument[];
}

// ============================================================================
// VEHICLE DOCUMENTS
// ============================================================================

export async function getVehicleDocuments(supabase: any, driverId: string) {

  const { data, error } = await supabase
    .from("admin_driver_documents_with_reviewer_v4_fix")
    .select("*")
    .eq("driver_id", driverId)
    .eq("entity_type", "vehicle")
    .order("document_type", { ascending: true });

  if (error) {
    console.error("Error fetching vehicle documents:", error);
    throw new Error(error.message);
  }

  return data as VehicleDocument[];
}

// ============================================================================
// DOCUMENT ACTIONS
// ============================================================================

export async function approveDriverDocument(
  supabase: any,
  documentId: string
) {
  // Call RPC function (handles status update + audit logging)
  const { error: rpcError } = await supabase.rpc("approve_driver_document", {
    p_document_id: documentId,
  });

  if (rpcError) {
    console.error("Error approving driver document:", rpcError);
    throw new Error(rpcError.message);
  }

  // Fetch updated document
  const { data, error } = await supabase
    .from("driver_documents")
    .select()
    .eq("id", documentId)
    .single();

  if (error) {
    console.error("Error fetching updated driver document:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function rejectDriverDocument(
  supabase: any,
  documentId: string,
  reason: string
) {
  // Call RPC function (handles status update + audit logging)
  const { error: rpcError } = await supabase.rpc("reject_driver_document", {
    p_document_id: documentId,
    p_rejection_reason: reason,
  });

  if (rpcError) {
    console.error("Error rejecting driver document:", rpcError);
    throw new Error(rpcError.message);
  }

  // Fetch updated document
  const { data, error } = await supabase
    .from("driver_documents")
    .select()
    .eq("id", documentId)
    .single();

  if (error) {
    console.error("Error fetching updated driver document:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function approveVehicleDocument(
  supabase: any,
  documentId: string
) {
  // Call RPC function (handles status update + audit logging)
  const { error: rpcError } = await supabase.rpc("approve_vehicle_document", {
    p_document_id: documentId,
  });

  if (rpcError) {
    console.error("Error approving vehicle document:", rpcError);
    throw new Error(rpcError.message);
  }

  // Fetch updated document
  const { data, error } = await supabase
    .from("vehicle_documents")
    .select()
    .eq("id", documentId)
    .single();

  if (error) {
    console.error("Error fetching updated vehicle document:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function rejectVehicleDocument(
  supabase: any,
  documentId: string,
  reason: string
) {
  // Call RPC function (handles status update + audit logging)
  const { error: rpcError } = await supabase.rpc("reject_vehicle_document", {
    p_document_id: documentId,
    p_rejection_reason: reason,
  });

  if (rpcError) {
    console.error("Error rejecting vehicle document:", rpcError);
    throw new Error(rpcError.message);
  }

  // Fetch updated document
  const { data, error } = await supabase
    .from("vehicle_documents")
    .select()
    .eq("id", documentId)
    .single();

  if (error) {
    console.error("Error fetching updated vehicle document:", error);
    throw new Error(error.message);
  }

  return data;
}

// ============================================================================
// DOCUMENT STATUS LOGS
// ============================================================================

export async function getDocumentLogs(
  supabase: any,
  organizationId: string,
  documentIds: string[]
) {

  const { data, error } = await supabase
    .from("document_status_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .in("document_id", documentIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching document logs:", error);
    throw new Error(error.message);
  }

  return data as DocumentStatusLog[];
}

export async function getDriverActivityLogs(
  supabase: any,
  organizationId: string,
  driverId: string
) {
  // Get all document IDs for this driver
  const [driverDocs, vehicleDocs] = await Promise.all([
    getDriverDocuments(supabase, driverId),
    getVehicleDocuments(supabase, driverId),
  ]);

  const documentIds = [
    ...driverDocs.map((d) => d.id),
    ...vehicleDocs.map((d) => d.id),
  ];

  if (documentIds.length === 0) {
    return [];
  }

  return getDocumentLogs(supabase, organizationId, documentIds);
}
