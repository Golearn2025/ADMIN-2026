/**
 * POST /api/admin/jobs/quote
 * Proxy to pricing backend: calculate-and-quote
 * Returns quoteId + pricing for any booking type.
 */
import { NextRequest, NextResponse } from "next/server";

const BACKEND = (process.env.BACKEND_PROXY_TARGET || "https://pricing.vantage-lane.com").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const upstream = await fetch(`${BACKEND}/api/pricing/calculate-and-quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error("[admin/jobs/quote] error:", err);
    return NextResponse.json({ success: false, error: "Pricing backend unreachable" }, { status: 502 });
  }
}
