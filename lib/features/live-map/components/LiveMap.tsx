"use client";

import { useEffect, useState } from "react";
import Map from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useLiveDrivers } from "../hooks/useLiveDrivers";
import { DriverMarker } from "./DriverMarker";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { DriverDetailsPanel } from "./DriverDetailsPanel";
import { LiveDriver } from "../types";
import { getLiveDriverStatus, type LiveDriverStatus } from "../utils/driverStatus";

interface LiveMapProps {
  className?: string;
}

const MAP_STYLES = {
  dark: { label: "Dark", url: "mapbox://styles/mapbox/dark-v11" },
  streets: { label: "Streets", url: "mapbox://styles/mapbox/streets-v12" },
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;

const MAP_STYLE_STORAGE_KEY = "live-map-style";

export function LiveMap({ className = "" }: LiveMapProps) {
  const { drivers, loading } = useLiveDrivers();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [focusFilter, setFocusFilter] = useState<"all" | LiveDriverStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<LiveDriver | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem(MAP_STYLE_STORAGE_KEY);
    if (saved === "dark" || saved === "streets") setMapStyle(saved);
  }, []);

  const changeMapStyle = (style: MapStyleKey) => {
    setMapStyle(style);
    window.localStorage.setItem(MAP_STYLE_STORAGE_KEY, style);
  };

  if (loading) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-[#0B0F14] ${className}`}>
        <div className="text-[#E8EEF6]">Loading live drivers...</div>
      </div>
    );
  }

  const filteredDrivers =
    focusFilter === "all"
      ? drivers
      : drivers.filter((driver) => getLiveDriverStatus(driver) === focusFilter);

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col overflow-y-auto bg-[#0B0F14] lg:overflow-hidden ${className}`}
    >
      <TopBar
        drivers={drivers}
        autoRefresh={autoRefresh}
        onAutoRefreshToggle={() => setAutoRefresh(!autoRefresh)}
        focusFilter={focusFilter}
        onFocusChange={setFocusFilter}
      />

      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden">
        <Sidebar
          drivers={filteredDrivers}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedDriver={selectedDriver}
          onDriverSelect={setSelectedDriver}
        />

        <div className="relative h-[60vh] min-h-[320px] w-full shrink-0 lg:h-auto lg:min-h-0 lg:min-w-0 lg:flex-1 lg:shrink">
          <Map
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
            initialViewState={{
              longitude: -0.1276,
              latitude: 51.5074,
              zoom: 10,
            }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            mapStyle={MAP_STYLES[mapStyle].url}
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

          <div className="absolute right-3 top-3 z-10 flex overflow-hidden rounded-lg border border-gray-700 bg-[#0B0F14]/90 shadow-lg backdrop-blur">
            {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => changeMapStyle(key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  mapStyle === key
                    ? "bg-[#D6B25E] text-[#0B0F14]"
                    : "text-gray-300 hover:text-[#E8EEF6]"
                }`}
              >
                {MAP_STYLES[key].label}
              </button>
            ))}
          </div>
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
