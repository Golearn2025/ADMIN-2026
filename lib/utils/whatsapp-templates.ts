import type { Booking } from "@/app/(admin)/bookings/types";

interface BookingExtras {
  included_services_json?: string[];
  paid_upgrades_json?: Record<string, unknown>;
  premium_features_json?: Record<string, unknown>;
  additional_stops_json?: Array<{ address: string; order?: number }> | null;
}

/**
 * Format date pentru WhatsApp template
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  const time = date.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} ${month} ${year}, ${time}`;
}

/**
 * Format duration pentru WhatsApp
 */
function formatDuration(minutes: number | null): string {
  if (!minutes) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Format booking type
 */
function formatBookingType(type: string): string {
  const types: Record<string, string> = {
    oneway: 'One-way',
    return: 'Return',
    hourly: 'Hourly',
    daily: 'Daily',
    fleet: 'Fleet',
    bespoke: 'Bespoke'
  };
  return types[type] || type;
}

/**
 * Generate Google Maps Directions link (full route)
 */
function getRouteLink(pickup: string, dropoff: string): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(dropoff)}`;
}

/**
 * Standard service info pentru toate booking-urile
 */
function getServiceInfo(): string {
  return `
*SERVICE INCLUDES:*
- Professional driver in formal attire
- Payment due after journey completion
- Meet & Greet service
- All fees included (tolls, parking, fuel)`;
}

/**
 * Template Public - fără date sensibile
 * Pentru share în grupuri sau public
 */
export function getPublicShareTemplate(
  booking: Booking,
  extras: BookingExtras | null = null
): string {
  return `--------------------------------
*VANTAGE LANE TRANSPORT*
--------------------------------

*BOOKING REFERENCE:* ${booking.reference}
*DATE & TIME:* ${formatDateTime(booking.scheduled_at)}
*SERVICE TYPE:* ${formatBookingType(booking.booking_type)}

--------------------------------

*ROUTE:*
FROM: ${booking.pickup_address}
TO: ${booking.dropoff_address}

View full route on map:
${getRouteLink(booking.pickup_address, booking.dropoff_address)}

--------------------------------

*VEHICLE:*
${booking.requested_vehicle_display || booking.requested_vehicle_category_label}
${getServiceInfo()}

--------------------------------

*ALL IN PRICE:*
${booking.distance_miles} miles | ${formatDuration(booking.duration_min)}
*Total journey cost included*

--------------------------------
Questions? Contact us for details.`;
}

/**
 * Template Private - cu prenume + telefon client
 * Pentru share direct cu client sau echipă
 */
export function getPrivateShareTemplate(
  booking: Booking,
  extras: BookingExtras | null = null
): string {
  return `--------------------------------
*VANTAGE LANE TRANSPORT*
--------------------------------

*CLIENT:* ${booking.customer_first_name}
*PHONE:* ${booking.customer_phone}

--------------------------------

*BOOKING REFERENCE:* ${booking.reference}
*DATE & TIME:* ${formatDateTime(booking.scheduled_at)}
*SERVICE TYPE:* ${formatBookingType(booking.booking_type)}

--------------------------------

*ROUTE:*
FROM: ${booking.pickup_address}
TO: ${booking.dropoff_address}

View full route on map:
${getRouteLink(booking.pickup_address, booking.dropoff_address)}

--------------------------------

*VEHICLE:*
${booking.requested_vehicle_display || booking.requested_vehicle_category_label}
${getServiceInfo()}

--------------------------------

*ALL IN PRICE:*
${booking.distance_miles} miles | ${formatDuration(booking.duration_min)}
*Total journey cost included*

--------------------------------
Questions? Contact us for details.`;
}

/**
 * Open WhatsApp with pre-filled message
 */
export function openWhatsApp(message: string): void {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
}
