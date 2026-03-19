// ============================================================================
// useDriverDetails - FETCH COMPLETE DRIVER DATA
// ============================================================================

"use client";

import { useState, useEffect } from "react";
import type { Driver, DriverDocument, VehicleDocument } from "../drivers.types";

// Response from admin_driver_full_v3 view
interface DriverFullDetails extends Driver {
  // Arrays from view (already included in Driver type)
  vehicles: any[];
  driver_documents: DriverDocument[];
  vehicle_documents: any[];
}

export function useDriverDetails(driverId: string | null) {
  const [data, setData] = useState<DriverFullDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driverId) {
      setData(null);
      return;
    }

    fetchDriverDetails();
  }, [driverId]);

  const fetchDriverDetails = async () => {
    if (!driverId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/drivers/${driverId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch driver details");
      }

      const result = await response.json();
      
      console.log("✅ Driver details from admin_driver_full_v3");
      console.log("   vehicles:", result.vehicles?.length || 0);
      console.log("   driver_documents:", result.driver_documents?.length || 0);
      console.log("   vehicle_documents:", result.vehicle_documents?.length || 0);
      console.log("📄 DRIVER DOCUMENTS DATA:", result.driver_documents);
      console.log("🚗 VEHICLE DOCUMENTS DATA:", result.vehicle_documents);
      
      // Use response directly - no mapping needed
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching driver details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    driver: data || null,
    driverDocuments: data?.driver_documents || [],
    vehicles: data?.vehicles || [],
    vehicleDocuments: data?.vehicle_documents || [],
    isLoading,
    error,
    refetch: fetchDriverDetails,
  };
}
