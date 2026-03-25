"use client";

import { useEffect, useRef } from "react";
import { Marker } from "react-map-gl/mapbox";
import { LiveDriver } from "@/lib/features/live-map/types";
import { 
  createDriverMarkerContainer, 
  getDriverColor, 
  getVehicleScale 
} from "../utils/markerUtils";

interface DriverMarkerProps {
  driver: LiveDriver;
  onClick?: () => void;
  isSelected?: boolean;
}

export function DriverMarker({ driver, onClick, isSelected = false }: DriverMarkerProps) {
  const markerRef = useRef<HTMLDivElement | null>(null);

  if (!driver.lat || !driver.lng) return null;

  // Get color based on driver status
  const color = getDriverColor(driver.computed_status);
  
  // Get vehicle info for scaling
  const vehicles = (driver as any).vehicles || [];
  const vehicle = vehicles.find((v: any) => v?.license_plate) || vehicles[0];
  const vehicleScale = getVehicleScale(vehicle?.category);
  const licensePlate = vehicle?.license_plate;

  // Create marker container
  useEffect(() => {
    if (markerRef.current) {
      const container = createDriverMarkerContainer({
        driverName: `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Unknown',
        color,
        rotation: 0,
        vehicleScale: isSelected ? vehicleScale * 1.2 : vehicleScale,
        licensePlate,
      });

      // Clear previous content
      markerRef.current.innerHTML = '';
      markerRef.current.appendChild(container);

      // Add click handler
      container.addEventListener('click', () => {
        if (onClick) onClick();
      });
    }
  }, [driver, color, vehicleScale, licensePlate, isSelected, onClick]);

  return (
    <Marker
      longitude={driver.lng}
      latitude={driver.lat}
      anchor="center"
    >
      <div 
        ref={markerRef}
        className={`transition-all duration-300 ${isSelected ? 'scale-110' : ''}`}
      />
    </Marker>
  );
}
