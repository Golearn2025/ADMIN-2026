"use client";

import { useState } from "react";
import Map from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useLiveDrivers } from "../hooks/useLiveDrivers";
import { DriverMarker } from "./DriverMarker";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { DriverDetailsPanel } from "./DriverDetailsPanel";
import { LiveDriver } from "../types";

interface LiveMapProps {
  className?: string;
}

export function LiveMap({ className = "" }: LiveMapProps) {
  const { drivers, loading } = useLiveDrivers();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [focusFilter, setFocusFilter] = useState<"all" | "online" | "in_trip">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<LiveDriver | null>(null);

  if (loading) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-[#0B0F14] ${className}`}>
        <div className="text-[#E8EEF6]">Loading live drivers...</div>
      </div>
    );
  }

  // Apply focus filter
  const filteredDrivers = drivers.filter(driver => {
    if (focusFilter === "online") return driver.computed_status === "ONLINE_IDLE";
    if (focusFilter === "in_trip") return driver.computed_status === "ON_TRIP";
    return true;
  });

  return (
    <div className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0F14] ${className}`}>
      <TopBar
        drivers={filteredDrivers}
        autoRefresh={autoRefresh}
        onAutoRefreshToggle={() => setAutoRefresh(!autoRefresh)}
        focusFilter={focusFilter}
        onFocusChange={setFocusFilter}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          drivers={filteredDrivers}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedDriver={selectedDriver}
          onDriverSelect={setSelectedDriver}
        />

        <div className="relative min-h-0 min-w-0 flex-1">
          <Map
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
            initialViewState={{
              longitude: -0.1276,
              latitude: 51.5074,
              zoom: 10,
            }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            attributionControl={false}
          >
            {filteredDrivers.map((driver) => (
              <DriverMarker
                key={driver.driver_id}
                driver={driver}
                onClick={() => setSelectedDriver(driver)}
                isSelected={selectedDriver?.driver_id === driver.driver_id}
              />
            ))}
          </Map>
        </div>

        {selectedDriver && (
          <DriverDetailsPanel
            driver={selectedDriver}
            onClose={() => setSelectedDriver(null)}
          />
        )}
      </div>
    </div>
  );
}
