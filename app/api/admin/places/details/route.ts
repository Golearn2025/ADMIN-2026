/**
 * GET /api/admin/places/details?placeId=...
 * Fetch lat/lng + formatted address for a Google Place ID.
 */
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("placeId")?.trim() ?? "";
  if (!placeId) return NextResponse.json({ error: "placeId required" }, { status: 400 });
  if (!GOOGLE_KEY) return NextResponse.json({ error: "Google Maps key not configured" }, { status: 503 });

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", GOOGLE_KEY);
  url.searchParams.set("fields", "formatted_address,geometry,place_id,name");

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    const result = data.result;
    if (!result) return NextResponse.json({ error: "Place not found" }, { status: 404 });

    // Prefer "Hotel Name, street address" so bookings show the place name
    // (formatted_address alone is often only the street / postcode).
    const name = typeof result.name === "string" ? result.name.trim() : "";
    const formatted =
      typeof result.formatted_address === "string" ? result.formatted_address.trim() : "";
    let address = formatted || name;
    if (name && formatted) {
      const nameLower = name.toLowerCase();
      const formattedLower = formatted.toLowerCase();
      if (!formattedLower.startsWith(nameLower) && !formattedLower.includes(`, ${nameLower}`)) {
        address = `${name}, ${formatted}`;
      }
    }

    return NextResponse.json({
      placeId: result.place_id,
      name: name || null,
      address,
      lat: result.geometry?.location?.lat ?? null,
      lng: result.geometry?.location?.lng ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Google Places error" }, { status: 502 });
  }
}
