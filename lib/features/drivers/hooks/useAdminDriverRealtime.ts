"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDriverDetails } from "./useDriverDetails";

interface UseAdminDriverRealtimeProps {
  driverId: string;
}

/**
 * Enterprise realtime for Admin Driver module
 * 
 * Model:
 * - READ: admin_drivers_list_v4 (single source of truth)
 * - WRITE: drivers, driver_documents, vehicle_documents (tables)
 * - REALTIME: drivers, driver_documents, vehicle_documents
 * - UI: Refresh from view only
 */
export function useAdminDriverRealtime({ driverId }: UseAdminDriverRealtimeProps) {
  const channelRef = useRef<any>(null);
  
  // Get refetch function directly from the hook
  const { refetchDriver } = useDriverDetails(driverId);

  useEffect(() => {
    if (!driverId) return;

    const supabase = createClient();

    // Create ONE channel for all driver-related changes
    const channel = supabase
      .channel('admin_driver_realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'drivers',
          filter: `id=eq.${driverId}`
        },
        async () => {
          console.log('🔄 Driver table changed - refetching from view');
          await refetchDriver();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'driver_documents',
          filter: `driver_id=eq.${driverId}`
        },
        async () => {
          console.log('🔄 Driver documents changed - refetching from view');
          await refetchDriver();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_documents', 
          filter: `driver_id=eq.${driverId}`
        },
        async () => {
          console.log('🔄 Vehicle documents changed - refetching from view');
          await refetchDriver();
        }
      );

    // Subscribe to channel
    channel.subscribe((status) => {
      console.log('🔌 Realtime status:', status);
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        console.log('🔌 Cleaning up realtime channel');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [driverId]);

  // Return cleanup function for manual cleanup if needed
  return {
    cleanup: () => {
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }
  };
}
