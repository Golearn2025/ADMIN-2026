"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LiveDriver } from "../types";

export function useLiveDrivers() {
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    const fetchDrivers = async () => {
      try {
        const { data, error } = await supabase
          .from("admin_live_drivers_v1")
          .select("*")
          .in("computed_status", ["ONLINE_IDLE", "ON_TRIP"]);

        if (error) {
          console.error("Error fetching live drivers:", error);
          return;
        }

        
        const formattedDrivers = (data || []).map((driver: any) => {
          const mapped = {
            driver_id: driver.driver_id,
            first_name: driver.first_name || "Unknown",
            last_name: driver.last_name || "Driver",
            profile_photo_url: driver.profile_photo_url,
            email: driver.email, // Folosim email din view
            phone: driver.phone, // Folosim phone din view
            lat: Number(driver.lat),
            lng: Number(driver.lng),
            computed_status: driver.computed_status,
            organization_id: driver.organization_id,
            current_booking_id: driver.current_booking_id, // Folosim current_booking_id din view
            updated_at: driver.updated_at,
            rating_average: driver.rating_average,
            total_trips: driver.rating_count, // Folosim rating_count
            vehicle_id: driver.vehicle_id,
            vehicle_model: driver.vehicle_model,
            vehicle_category: driver.vehicle_category,
            plate_number: driver.license_plate, // View-ul folosește license_plate
          };
          
          return mapped;
        });

        setDrivers(formattedDrivers);
      } catch (err) {
        console.error("Error in fetchDrivers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();

    // Realtime subscription
    const channel = supabase
      .channel("driver-locations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_locations",
        },
        async () => {
          const { data, error } = await supabase
            .from("admin_live_drivers_v1")
            .select("*")
            .in("computed_status", ["ONLINE_IDLE", "ON_TRIP"]);

          if (error) {
            console.error("Error in realtime fetch:", error);
            return;
          }

          const formattedDrivers = (data || []).map((driver: any) => ({
            driver_id: driver.driver_id,
            first_name: driver.first_name || "Unknown",
            last_name: driver.last_name || "Driver",
            profile_photo_url: driver.profile_photo_url,
            email: undefined, // View-ul nu are email
            phone: undefined, // View-ul nu are phone
            lat: Number(driver.lat),
            lng: Number(driver.lng),
            computed_status: driver.computed_status,
            organization_id: driver.organization_id,
            organization_name: undefined, // View-ul nu are organization_name
            current_booking_id: undefined, // View-ul nu are current_booking_id
            updated_at: driver.updated_at,
            rating_average: driver.rating_average,
            total_trips: driver.rating_count, // Folosim rating_count
            vehicle_id: driver.vehicle_id,
            vehicle_model: driver.vehicle_model,
            vehicle_category: driver.vehicle_category,
            plate_number: driver.license_plate, // View-ul folosește license_plate
          }));

          setDrivers(formattedDrivers);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { drivers, loading };
}
