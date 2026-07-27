"use client";

import { LiveMap } from "@/lib/features/live-map";

export default function LiveMapPage() {
  return (
    <div className="h-full w-full min-h-0 overflow-hidden">
      <LiveMap className="h-full min-h-0" />
    </div>
  );
}
