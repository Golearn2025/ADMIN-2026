import { createClient } from "@/lib/supabase/server";
import { LiveDriver } from "./types";

export async function getLiveDrivers(): Promise<LiveDriver[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("admin_live_drivers_v1")
    .select("*")
    .in("computed_status", ["ONLINE_IDLE", "ON_TRIP"]);

  if (error) {
    console.error("Error fetching live drivers:", error);
    return [];
  }

  return (data || []).map(driver => ({
    driver_id: driver.driver_id,
    first_name: driver.driver_name?.split(' ')[0] || "Unknown",
    last_name: driver.driver_name?.split(' ').slice(1).join(' ') || "Driver",
    lat: Number(driver.lat),
    lng: Number(driver.lng),
    computed_status: driver.computed_status,
    organization_id: driver.organization_id,
    current_booking_id: driver.current_booking_id,
    last_location_update: driver.last_location_update,
    updated_at: new Date().toISOString(),
  }));
}
