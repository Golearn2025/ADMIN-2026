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

export async function getDrivers(supabase: any, organizationId: string) {

  const { data, error } = await supabase
    .from("admin_drivers_list_v3")
    .select("*")
    .eq("organization_id", organizationId)
    .order("first_name", { ascending: true });

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
    .from("driver_documents")
    .select("*")
    .eq("driver_id", driverId)
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
    .from("vehicle_documents")
    .select(
      `
      *,
      vehicles!inner(driver_id)
    `
    )
    .eq("vehicles.driver_id", driverId)
    .order("document_type", { ascending: true });

  if (error) {
    console.error("Error fetching vehicle documents:", error);
    throw new Error(error.message);
  }

  // Remove nested vehicles object
  const cleanedData = data?.map(({ vehicles, ...rest }: { vehicles: any; [key: string]: any }) => rest) || [];
  return cleanedData as VehicleDocument[];
}

// ============================================================================
// DOCUMENT ACTIONS
// ============================================================================

export async function approveDriverDocument(
  supabase: any,
  documentId: string,
  reviewedBy: string
) {

  const { data, error } = await supabase
    .from("driver_documents")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      rejection_reason: null,
    })
    .eq("id", documentId)
    .select()
    .single();

  if (error) {
    console.error("Error approving driver document:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function rejectDriverDocument(
  supabase: any,
  documentId: string,
  reviewedBy: string,
  reason: string
) {

  const { data, error } = await supabase
    .from("driver_documents")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      rejection_reason: reason,
    })
    .eq("id", documentId)
    .select()
    .single();

  if (error) {
    console.error("Error rejecting driver document:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function approveVehicleDocument(
  supabase: any,
  documentId: string,
  reviewedBy: string
) {

  const { data, error } = await supabase
    .from("vehicle_documents")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      rejection_reason: null,
    })
    .eq("id", documentId)
    .select()
    .single();

  if (error) {
    console.error("Error approving vehicle document:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function rejectVehicleDocument(
  supabase: any,
  documentId: string,
  reviewedBy: string,
  reason: string
) {

  const { data, error } = await supabase
    .from("vehicle_documents")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      rejection_reason: reason,
    })
    .eq("id", documentId)
    .select()
    .single();

  if (error) {
    console.error("Error rejecting vehicle document:", error);
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
