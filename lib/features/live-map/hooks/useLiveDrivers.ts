"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LiveDriver } from "../types";

function mapLiveDriver(driver: any): LiveDriver {
  return {
    driver_id: driver.driver_id,
    first_name: driver.first_name || "Unknown",
    last_name: driver.last_name || "Driver",
    profile_photo_url: driver.profile_photo_url,
    email: driver.email,
    phone: driver.phone,
    lat: Number(driver.lat),
    lng: Number(driver.lng),
    computed_status: driver.computed_status,
    normalized_status: driver.normalized_status ?? undefined,
    raw_status: driver.raw_status ?? undefined,
    organization_id: driver.organization_id,
    updated_at: driver.updated_at,
    rating_average: driver.rating_average != null ? Number(driver.rating_average) : undefined,
    total_trips: driver.rating_count,
    vehicle_id: driver.vehicle_id,
    vehicle_model: driver.vehicle_model,
    vehicle_category: driver.vehicle_category,
    vehicle_year: driver.vehicle_year,
    vehicle_color: driver.vehicle_color,
    plate_number: driver.license_plate,
    online_status: driver.online_status,
  };
}

export function useLiveDrivers() {
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // View already limits to online drivers with a fresh GPS fix
    const fetchDrivers = async () => {
      try {
        const { data, error } = await supabase.from("admin_live_drivers_v1").select("*");

        if (error) {
          console.error("Error fetching live drivers:", error);
          return;
        }

        setDrivers((data || []).map(mapLiveDriver));
      } catch (err) {
        console.error("Error in fetchDrivers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();

    const channel = supabase
      .channel("driver-locations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_locations",
        },
        () => {
          fetchDrivers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { drivers, loading };
}
