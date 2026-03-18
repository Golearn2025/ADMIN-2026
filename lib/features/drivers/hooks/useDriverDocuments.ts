// ============================================================================
// useDriverDocuments - DOCUMENTS STATE MANAGEMENT
// ============================================================================

"use client";

import { useState, useEffect } from "react";
import type { DriverDocument, VehicleDocument } from "../drivers.types";

interface UseDriverDocumentsProps {
  driverId: string | null;
}

export function useDriverDocuments({ driverId }: UseDriverDocumentsProps) {
  const [driverDocuments, setDriverDocuments] = useState<DriverDocument[]>([]);
  const [vehicleDocuments, setVehicleDocuments] = useState<VehicleDocument[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (driverId) {
      fetchDocuments();
    } else {
      setDriverDocuments([]);
      setVehicleDocuments([]);
    }
  }, [driverId]);

  const fetchDocuments = async () => {
    if (!driverId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [driverDocsRes, vehicleDocsRes] = await Promise.all([
        fetch(`/api/admin/drivers/${driverId}/documents/driver`),
        fetch(`/api/admin/drivers/${driverId}/documents/vehicle`),
      ]);

      if (!driverDocsRes.ok || !vehicleDocsRes.ok) {
        throw new Error("Failed to fetch documents");
      }

      const [driverDocsData, vehicleDocsData] = await Promise.all([
        driverDocsRes.json(),
        vehicleDocsRes.json(),
      ]);

      setDriverDocuments(driverDocsData.documents || []);
      setVehicleDocuments(vehicleDocsData.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching documents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingDriverDocs = driverDocuments.filter(
    (doc) => doc.status === "pending"
  );
  const approvedDriverDocs = driverDocuments.filter(
    (doc) => doc.status === "approved"
  );
  const rejectedDriverDocs = driverDocuments.filter(
    (doc) => doc.status === "rejected"
  );

  const pendingVehicleDocs = vehicleDocuments.filter(
    (doc) => doc.status === "pending"
  );
  const approvedVehicleDocs = vehicleDocuments.filter(
    (doc) => doc.status === "approved"
  );
  const rejectedVehicleDocs = vehicleDocuments.filter(
    (doc) => doc.status === "rejected"
  );

  return {
    driverDocuments,
    vehicleDocuments,
    pendingDriverDocs,
    approvedDriverDocs,
    rejectedDriverDocs,
    pendingVehicleDocs,
    approvedVehicleDocs,
    rejectedVehicleDocs,
    isLoading,
    error,
    refetch: fetchDocuments,
  };
}
