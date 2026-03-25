"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { LiveDriver } from "../types";
import { AdvancedFilters } from "./AdvancedFilters";

interface SidebarProps {
  drivers: LiveDriver[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDriver: LiveDriver | null;
  onDriverSelect: (driver: LiveDriver) => void;
}

export function Sidebar({
  drivers,
  searchQuery,
  onSearchChange,
  selectedDriver,
  onDriverSelect,
}: SidebarProps) {
  // State for advanced vehicle filters
  const [vehicleFilters, setVehicleFilters] = useState({
    plateNumber: '',
    vehicleColor: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleCategory: '',
  });

  const filteredDrivers = drivers.filter(driver => {
    // Search across multiple fields
    const searchFields = [
      `${driver.first_name} ${driver.last_name}`,
      driver.plate_number || '',
      driver.vehicle_model || '',
      driver.vehicle_category || '',
      // Add bonus fields if available
      driver.vehicle_color || '',
      driver.vehicle_year?.toString() || '',
    ].join(' ').toLowerCase();
    
    const matchesSearch = searchFields.includes(searchQuery.toLowerCase());
    
    // Advanced vehicle filters
    const matchesPlate = !vehicleFilters.plateNumber || 
      driver.plate_number?.toLowerCase().includes(vehicleFilters.plateNumber.toLowerCase());
    
    const matchesColor = !vehicleFilters.vehicleColor || 
      driver.vehicle_color?.toLowerCase().includes(vehicleFilters.vehicleColor.toLowerCase());
    
    const matchesModel = !vehicleFilters.vehicleModel || 
      driver.vehicle_model?.toLowerCase().includes(vehicleFilters.vehicleModel.toLowerCase());
    
    const matchesYear = !vehicleFilters.vehicleYear || 
      driver.vehicle_year?.toString().includes(vehicleFilters.vehicleYear);
    
    const matchesCategory = !vehicleFilters.vehicleCategory || 
      driver.vehicle_category?.toLowerCase().includes(vehicleFilters.vehicleCategory.toLowerCase());
    
    return matchesSearch && 
           matchesPlate && matchesColor && matchesModel && matchesYear && matchesCategory;
  });

  const handleReset = () => {
    onSearchChange('');
    setVehicleFilters({
      plateNumber: '',
      vehicleColor: '',
      vehicleModel: '',
      vehicleYear: '',
      vehicleCategory: '',
    });
  };

  return (
    <div className="w-80 border-r border-gray-800 bg-[#0B0F14] flex flex-col h-full">
      {/* Advanced Filters */}
      <AdvancedFilters
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        vehicleFilters={vehicleFilters}
        onVehicleFiltersChange={setVehicleFilters}
        onReset={handleReset}
      />

      {/* Driver List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="text-xs font-medium text-gray-400 mb-3">
            DRIVERS ({filteredDrivers.length})
          </div>
          <div className="space-y-2">
            {filteredDrivers.map((driver) => (
              <button
                key={driver.driver_id}
                onClick={() => onDriverSelect(driver)}
                className={`w-full text-left rounded-lg p-3 transition-colors ${
                  selectedDriver?.driver_id === driver.driver_id
                    ? "bg-[#D6B25E]/10 border border-[#D6B25E]"
                    : "bg-[#101824] border border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Profile Photo */}
                    {driver.profile_photo_url ? (
                      <img
                        src={driver.profile_photo_url}
                        alt={`${driver.first_name} ${driver.last_name}`}
                        className="h-8 w-8 rounded-full object-cover border border-gray-700"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[#0B0F14] border border-gray-700 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                    
                    {/* Name and Status Indicator */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            driver.computed_status === "ON_TRIP"
                              ? "bg-red-500 animate-pulse"
                              : "bg-[#D6B25E]"
                          }`}
                        />
                        <span className="text-sm font-medium text-[#E8EEF6]">
                          {driver.first_name} {driver.last_name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 ml-4 font-mono">
                        {driver.plate_number || 'No Plate'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        driver.computed_status === "ON_TRIP"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-[#D6B25E]/10 text-[#D6B25E]"
                      }`}
                    >
                      {driver.computed_status === "ON_TRIP" ? "On Trip" : "Online"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {driver.vehicle_model || 'No Vehicle'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
