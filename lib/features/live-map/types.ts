export interface LiveDriver {
  driver_id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
  email?: string; // Not available in new view
  phone?: string; // Not available in new view
  lat: number;
  lng: number;
  computed_status: "ONLINE_IDLE" | "ON_TRIP" | "OFFLINE" | "READY";
  organization_id: string;
  organization_name?: string; // Not available in new view
  current_booking_id?: string; // Not available in new view
  updated_at: string;
  rating_average?: number;
  total_trips?: number; // Maps to rating_count in view
  vehicle_id?: string;
  vehicle_model?: string;
  vehicle_category?: string;
  plate_number?: string; // Maps to license_plate in view
  
  // Bonus fields from new view (optional for future use)
  vehicle_year?: number;
  vehicle_color?: string;
  online_status?: string;
  is_available?: boolean;
  is_active?: boolean;
  is_approved?: boolean;
  is_live?: boolean;
  normalized_status?: string;
  raw_status?: string;
}

export interface LiveMapConfig {
  center: [number, number];
  zoom: number;
  style: string;
}
