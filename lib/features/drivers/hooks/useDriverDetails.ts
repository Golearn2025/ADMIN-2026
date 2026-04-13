// ============================================================================
// useDriverDetails - FETCH COMPLETE DRIVER DATA
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Driver, DriverDocument, VehicleDocument } from "../drivers.types";

// Response from V4 modular API (combines multiple V4 views)
interface DriverFullDetails extends Driver {
  vehicles: any[];
  driver_documents: DriverDocument[];
  vehicle_documents: any[];
}

export function useDriverDetails(driverId: string | null) {
  const [data, setData] = useState<DriverFullDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDriverDetails = useCallback(async () => {
    if (!driverId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/drivers/${driverId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch driver details");
      }

      const result = await response.json();
      
      console.log("✅ Driver details from V4 modular views");
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
  }, [driverId]); // ✅ driverId dependency - needed for URL

  useEffect(() => {
    if (!driverId) {
      setData(null);
      return;
    }

    fetchDriverDetails();
  }, [driverId, fetchDriverDetails]); // ✅ Adăugat fetchDriverDetails în deps

  // 🔥 ENTERPRISE REALTIME - State-based updates (no fetch)
  useEffect(() => {
    if (!driverId) return;

    const supabase = createClient();

    const channel = supabase
      .channel('driver-docs-realtime')

      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'driver_documents'
      }, (payload) => {
        console.log('🔄 REALTIME DOC', payload);
        
        // ✅ STATE PATCH - no fetch
        setData((prev) => {
          if (!prev) return prev;
          
          if (payload.eventType === 'DELETE') {
            return {
              ...prev,
              driver_documents: prev.driver_documents.filter((doc) => doc.id !== payload.old.id)
            };
          }
          
          return {
            ...prev,
            driver_documents: prev.driver_documents.map((doc) =>
              doc.id === payload.new.id ? payload.new as DriverDocument : doc
            )
          };
        });
      })

      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicle_documents'
      }, (payload) => {
        console.log('🔄 REALTIME VEHICLE DOC', payload);
        
        // ✅ STATE PATCH - no fetch
        setData((prev) => {
          if (!prev) return prev;
          
          if (payload.eventType === 'DELETE') {
            return {
              ...prev,
              vehicle_documents: prev.vehicle_documents.filter((doc) => doc.id !== payload.old.id)
            };
          }
          
          return {
            ...prev,
            vehicle_documents: prev.vehicle_documents.map((doc) =>
              doc.id === payload.new.id ? payload.new as VehicleDocument : doc
            )
          };
        });
      })

      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'drivers'
      }, (payload) => {
        console.log('🔄 REALTIME DRIVER', payload);
        
        // ✅ STATE PATCH - no fetch
        setData((prev) => {
          if (!prev) return prev;
          
          return {
            ...prev,
            ...payload.new as Driver
          };
        });
      })

      .subscribe((status) => {
        console.log('📡 REALTIME STATUS', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return {
    driver: data || null,
    driverDocuments: data?.driver_documents || [],
    vehicles: data?.vehicles || [],
    vehicleDocuments: data?.vehicle_documents || [],
    isLoading,
    error,
    refetch: fetchDriverDetails,
    refetchDriver: fetchDriverDetails, // Export for realtime hook
  };
}
