/**
 * Catch-all proxy → pricing.vantage-lane.com
 * Set BACKEND_PROXY_TARGET=https://pricing.vantage-lane.com in .env.local
 */
import { NextRequest, NextResponse } from "next/server";

function getTarget(): string | null {
  const raw = process.env.BACKEND_PROXY_TARGET?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return null;
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const TARGET = getTarget();
  if (!TARGET) {
    return NextResponse.json(
      { success: false, error: "Pricing backend not configured. Set BACKEND_PROXY_TARGET in .env.local." },
      { status: 503 }
    );
  }

  const subPath = params.path.join("/");
  const targetUrl = `${TARGET}/${subPath}`;

  const init: RequestInit = {
    method: req.method,
    headers: { "Content-Type": "application/json" },
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, {
      status: upstream.status,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("[backend-proxy] unreachable:", targetUrl, err);
    return NextResponse.json(
      { success: false, error: "Pricing backend unreachable." },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
