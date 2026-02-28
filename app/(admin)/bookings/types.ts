export interface Booking {
  id: string;
  reference: string;
  status: string;
  trip_status: string;
  booking_type: string;
  scheduled_at: string;
  created_at: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email?: string;
  pickup_address: string;
  dropoff_address: string;
  distance_miles: number;
  duration_min: number | null;
  requested_vehicle_category_label: string;
  requested_vehicle_model_label?: string;
  driver_name?: string;
  vehicle_plate?: string;
  display_price_pence: number;
  latest_payment_currency: string;
  latest_payment_status?: string;
  booked_hours: number;
  booked_days: number;
  return_scheduled_at: string | null;
  fleet_size: number;
}
