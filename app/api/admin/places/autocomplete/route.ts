/**
 * GET /api/admin/places/autocomplete?q=...
 * Proxy to Google Places Autocomplete API — keeps key server-side.
 */
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ predictions: [] });
  if (!GOOGLE_KEY) return NextResponse.json({ error: "Google Maps key not configured" }, { status: 503 });

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", q);
  url.searchParams.set("key", GOOGLE_KEY);
  url.searchParams.set("types", "geocode|establishment");
  url.searchParams.set("language", "en");
  url.searchParams.set("components", "country:gb");

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    return NextResponse.json({ predictions: data.predictions || [] });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}
