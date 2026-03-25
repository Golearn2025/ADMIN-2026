"use client";

import { useState } from "react";
import { Search, X, Filter, RotateCcw, Check, Car, Palette, Calendar, Tag } from "lucide-react";

// Vehicle data from existing codebase
const VEHICLE_MODELS = [
  { id: 'bmw-7-series', label: 'BMW 7 Series', category_id: 'luxury' },
  { id: 'mercedes-s-class', label: 'Mercedes S Class', category_id: 'luxury' },
  { id: 'bmw-5-series', label: 'BMW 5 Series', category_id: 'executive' },
  { id: 'mercedes-e-class', label: 'Mercedes E Class', category_id: 'executive' },
  { id: 'range-rover', label: 'Range Rover', category_id: 'suv' },
  { id: 'mercedes-v-class', label: 'Mercedes V Class', category_id: 'mpv' },
];

const COLORS = [
  { id: 'black', name: 'Black' },
  { id: 'white', name: 'White' },
  { id: 'silver', name: 'Silver' },
  { id: 'gray', name: 'Gray' },
  { id: 'blue', name: 'Blue' },
  { id: 'champagne', name: 'Champagne' },
  { id: 'red', name: 'Red' },
  { id: 'green', name: 'Green' },
  { id: 'yellow', name: 'Yellow' },
  { id: 'orange', name: 'Orange' },
  { id: 'brown', name: 'Brown' },
];

const CATEGORY_LABELS: { [key: string]: string } = {
  luxury: "Luxury",
  executive: "Executive",
  suv: "SUV",
  mpv: "MPV"
};

// Generate valid years
const currentYear = new Date().getFullYear();
const VALID_YEARS = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]; // 2026, 2025, 2024, 2023

interface AdvancedFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  vehicleFilters: {
    plateNumber: string;
    vehicleColor: string;
    vehicleModel: string;
    vehicleYear: string;
    vehicleCategory: string;
  };
  onVehicleFiltersChange: (filters: typeof vehicleFilters) => void;
  onReset: () => void;
}

export function AdvancedFilters({
  searchQuery,
  onSearchChange,
  vehicleFilters,
  onVehicleFiltersChange,
  onReset,
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateVehicleFilter = (field: keyof typeof vehicleFilters, value: string) => {
    onVehicleFiltersChange({
      ...vehicleFilters,
      [field]: value,
    });
  };

  const hasActiveFilters = 
    searchQuery ||
    Object.values(vehicleFilters).some(value => value.trim() !== '');

  return (
    <div className="p-4 border-b border-gray-800 bg-[#0B0F14]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#D6B25E]" />
          <span className="text-sm font-medium text-[#E8EEF6]">ADVANCED FILTERS</span>
          {hasActiveFilters && (
            <span className="h-2 w-2 rounded-full bg-[#D6B25E] animate-pulse" />
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-gray-400 hover:text-[#E8EEF6] transition-colors"
        >
          {isExpanded ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search drivers by name, plate, or vehicle..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg bg-[#101824] pl-10 pr-4 py-2 text-sm text-[#E8EEF6] placeholder-gray-500 border border-gray-800 focus:border-[#D6B25E] focus:outline-none [color-scheme:dark]"
          style={{ colorScheme: 'dark' }}
        />
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Vehicle Filters */}
          <div>
            <div className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-2">
              <Car className="h-3 w-3" />
              <span>VEHICLE FILTERS</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {/* Plate Number - Text Input */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  <Tag className="h-3 w-3" />
                </div>
                <input
                  type="text"
                  placeholder="Plate number..."
                  value={vehicleFilters.plateNumber}
                  onChange={(e) => updateVehicleFilter('plateNumber', e.target.value)}
                  className="w-full rounded-lg bg-[#101824] pl-8 pr-8 py-2 text-xs text-[#E8EEF6] placeholder-gray-500 border border-gray-800 focus:border-[#D6B25E] focus:outline-none [color-scheme:dark]"
                  style={{ colorScheme: 'dark' }}
                />
                {vehicleFilters.plateNumber && (
                  <button
                    onClick={() => updateVehicleFilter('plateNumber', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#E8EEF6]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Vehicle Color - Dropdown */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  <Palette className="h-3 w-3" />
                </div>
                <select
                  value={vehicleFilters.vehicleColor}
                  onChange={(e) => updateVehicleFilter('vehicleColor', e.target.value)}
                  className="w-full rounded-lg bg-[#101824] pl-8 pr-8 py-2 text-xs text-[#E8EEF6] placeholder-gray-500 border border-gray-800 focus:border-[#D6B25E] focus:outline-none [color-scheme:dark] appearance-none cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">Select color...</option>
                  {COLORS.map((color) => (
                    <option key={color.id} value={color.name}>
                      {color.name}
                    </option>
                  ))}
                </select>
                {vehicleFilters.vehicleColor && (
                  <button
                    onClick={() => updateVehicleFilter('vehicleColor', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#E8EEF6]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Vehicle Model - Dropdown */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  <Car className="h-3 w-3" />
                </div>
                <select
                  value={vehicleFilters.vehicleModel}
                  onChange={(e) => updateVehicleFilter('vehicleModel', e.target.value)}
                  className="w-full rounded-lg bg-[#101824] pl-8 pr-8 py-2 text-xs text-[#E8EEF6] placeholder-gray-500 border border-gray-800 focus:border-[#D6B25E] focus:outline-none [color-scheme:dark] appearance-none cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">Select model...</option>
                  {VEHICLE_MODELS.map((model) => (
                    <option key={model.id} value={model.label}>
                      {model.label}
                    </option>
                  ))}
                </select>
                {vehicleFilters.vehicleModel && (
                  <button
                    onClick={() => updateVehicleFilter('vehicleModel', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#E8EEF6]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Vehicle Year - Dropdown */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                </div>
                <select
                  value={vehicleFilters.vehicleYear}
                  onChange={(e) => updateVehicleFilter('vehicleYear', e.target.value)}
                  className="w-full rounded-lg bg-[#101824] pl-8 pr-8 py-2 text-xs text-[#E8EEF6] placeholder-gray-500 border border-gray-800 focus:border-[#D6B25E] focus:outline-none [color-scheme:dark] appearance-none cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">Select year...</option>
                  {VALID_YEARS.map((year) => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
                </select>
                {vehicleFilters.vehicleYear && (
                  <button
                    onClick={() => updateVehicleFilter('vehicleYear', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#E8EEF6]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Vehicle Category - Dropdown */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  <Tag className="h-3 w-3" />
                </div>
                <select
                  value={vehicleFilters.vehicleCategory}
                  onChange={(e) => updateVehicleFilter('vehicleCategory', e.target.value)}
                  className="w-full rounded-lg bg-[#101824] pl-8 pr-8 py-2 text-xs text-[#E8EEF6] placeholder-gray-500 border border-gray-800 focus:border-[#D6B25E] focus:outline-none [color-scheme:dark] appearance-none cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">Select category...</option>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
                {vehicleFilters.vehicleCategory && (
                  <button
                    onClick={() => updateVehicleFilter('vehicleCategory', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#E8EEF6]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-gray-400 bg-[#101824] border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Reset Filters
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-[#E8EEF6] bg-[#D6B25E]/10 border border-[#D6B25E] rounded-lg hover:bg-[#D6B25E]/20 transition-colors"
        >
          <Check className="h-3 w-3" />
          {hasActiveFilters ? 'Filters Applied' : 'No Filters'}
        </button>
      </div>
    </div>
  );
}
