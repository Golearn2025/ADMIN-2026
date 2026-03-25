"use client";

import { X, User, MapPin, Clock, Car, Phone, MessageSquare, Bell, Calendar, Star, Building, Navigation, Shield, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { LiveDriver } from "../types";


interface StatusDotProps {
  color: "blue" | "green" | "yellow" | "red" | "gray";
  pulse?: boolean;
}

function StatusDot({ color, pulse = false }: StatusDotProps) {
  const colors = {
    blue: "bg-blue-500 shadow-blue-500/50",
    green: "bg-green-500 shadow-green-500/50",
    yellow: "bg-yellow-500 shadow-yellow-500/50",
    red: "bg-red-500 shadow-red-500/50",
    gray: "bg-gray-500 shadow-gray-500/50",
  };

  return (
    <div
      className={`
        w-3 h-3 rounded-full 
        ${colors[color]} 
        shadow-md
        ${pulse ? "animate-pulse" : ""}
      `}
    />
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        group relative flex-1 flex items-center justify-center gap-2 
        px-3 py-2.5 rounded-xl 
        bg-[#101824] 
        border border-gray-800/50 

        transition-all duration-300 ease-out

        hover:bg-[#151c2b]
        hover:border-[#D6B25E]/60
        hover:shadow-[0_0_20px_rgba(214,178,94,0.25)]
        hover:-translate-y-[1px]

        active:scale-[0.97]
      "
    >
      {icon}

      <span className="text-xs text-gray-300 group-hover:text-white transition-all duration-300">
        {label}
      </span>

      <div className="
        absolute inset-0 rounded-xl 
        bg-gradient-to-r from-transparent via-[#D6B25E]/5 to-transparent 
        opacity-0 group-hover:opacity-100
        transition-opacity duration-500
      "/>
    </button>
  );
}

interface DriverDetailsPanelProps {
  driver: LiveDriver | null;
  onClose: () => void;
}

export function DriverDetailsPanel({ driver, onClose }: DriverDetailsPanelProps) {
  const router = useRouter();
  
  if (!driver) return null;

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "No data";
    
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return "Invalid date";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-96 border-l border-gray-800 bg-[#0B0F14] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-[#E8EEF6]">Driver Details</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-2 hover:bg-[#101824] transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Profile Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#D6B25E]/10 via-[#101824] to-[#0B0F14] p-6 border border-[#D6B25E]/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D6B25E]/5 rounded-full blur-3xl"></div>
          <div className="relative text-center">
            {driver.profile_photo_url ? (
              <img
                src={driver.profile_photo_url}
                alt={`${driver.first_name} ${driver.last_name}`}
                className="mx-auto h-20 w-20 rounded-full object-cover border-2 border-[#D6B25E] shadow-lg mb-3"
              />
            ) : (
              <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-[#D6B25E]/20 to-[#101824] flex items-center justify-center mb-3 border-2 border-[#D6B25E]">
                <User className="h-10 w-10 text-[#D6B25E]" />
              </div>
            )}
            <h4 className="text-xl font-bold text-[#E8EEF6] mb-1">
              {driver.first_name} {driver.last_name}
            </h4>
            <div className="flex items-center justify-center gap-2 mb-2">
              <StatusDot 
                color={
                  driver.computed_status === "ON_TRIP"
                    ? "red"
                    : driver.computed_status === "ONLINE_IDLE"
                    ? "green"
                    : "gray"
                } 
                pulse={driver.computed_status !== "OFFLINE"}
              />
              <span className={`text-sm font-medium ${
                driver.computed_status === "ON_TRIP" 
                  ? "text-red-400" 
                  : driver.computed_status === "ONLINE_IDLE"
                  ? "text-green-400"
                  : "text-gray-400"
              }`}>
                {driver.computed_status === "ON_TRIP" 
                  ? "On Trip" 
                  : driver.computed_status === "ONLINE_IDLE"
                  ? "Online"
                  : "Offline"
                }
              </span>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-[#D6B25E]">⭐</span>
                <span className="text-xs font-medium text-[#D6B25E]">{driver.rating_average?.toFixed(1) || "N/A"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Navigation className="h-3 w-3 text-gray-400" />
                <span className="text-xs font-medium text-gray-300">{driver.total_trips || 0} trips</span>
              </div>
            </div>
            
            {/* Contact Info */}
            <div className="flex flex-col items-center gap-2 mt-3">
              {driver.email && (
                <div className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0A0E14]/30 border border-gray-800/50 hover:border-[#D6B25E]/30 hover:bg-[#0A0E14]/50 transition-all duration-200 cursor-pointer">
                  <Mail className="h-3 w-3 text-[#D6B25E]" />
                  <span className="text-xs text-gray-300 truncate max-w-[160px] group-hover:text-[#E8EEF6] transition-colors">{driver.email}</span>
                </div>
              )}
              {driver.phone && (
                <div className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0A0E14]/30 border border-gray-800/50 hover:border-[#D6B25E]/30 hover:bg-[#0A0E14]/50 transition-all duration-200 cursor-pointer">
                  <Phone className="h-3 w-3 text-[#D6B25E]" />
                  <span className="text-xs text-gray-300 font-mono group-hover:text-[#E8EEF6] transition-colors">{driver.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <ActionButton
            icon={<Phone className="h-4 w-4 text-[#D6B25E] group-hover:text-[#FFD700]" />}
            label="Call"
            onClick={() => driver.phone && window.open(`tel:${driver.phone}`)}
          />
          <ActionButton
            icon={<MessageSquare className="h-4 w-4 text-green-400 group-hover:text-white" />}
            label="Chat"
          />
          <ActionButton
            icon={<Bell className="h-4 w-4 text-purple-400 group-hover:text-white" />}
            label="Notify"
          />
        </div>

        {/* Driver Actions - Immediately After Quick Actions */}
        <div className="flex gap-2 mt-3">
          <ActionButton
            icon={<User className="h-4 w-4 text-orange-400 group-hover:text-white" />}
            label="Driver Profile"
            onClick={() => router.push(`/drivers?driver=${driver.driver_id}`)}
          />
          <ActionButton
            icon={<Car className="h-4 w-4 text-cyan-400 group-hover:text-white" />}
            label="Assign Job"
          />
        </div>

        {/* Vehicle Information */}
        {(driver.vehicle_model || driver.vehicle_category || driver.plate_number) && (
          <div className="rounded-xl bg-gradient-to-br from-[#101824] via-[#0F1419] to-[#0A0E14] p-4 border border-gray-800/50 hover:border-[#D6B25E]/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[#D6B25E]/10 border border-[#D6B25E]/20">
                <Car className="h-4 w-4 text-[#D6B25E]" />
              </div>
              <h5 className="text-sm font-semibold text-[#E8EEF6]">Vehicle Details</h5>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {driver.vehicle_model && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A0E14]/50 border border-gray-800/30 hover:border-blue-400 hover:bg-blue-400/20 transition-all duration-200 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <StatusDot color="blue" />
                    <span className="text-xs text-gray-400 font-medium">Model</span>
                  </div>
                  <span className="text-sm text-[#E8EEF6] font-medium">{driver.vehicle_model}</span>
                </div>
              )}
              {driver.vehicle_category && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A0E14]/50 border border-gray-800/30 hover:border-green-400 hover:bg-green-400/20 transition-all duration-200 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <StatusDot color="green" />
                    <span className="text-xs text-gray-400 font-medium">Category</span>
                  </div>
                  <span className="text-sm text-[#E8EEF6] font-medium">{driver.vehicle_category}</span>
                </div>
              )}
              {driver.plate_number && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A0E14]/50 border border-gray-800/30 hover:border-yellow-400 hover:bg-yellow-400/20 transition-all duration-200 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <StatusDot color="yellow" />
                    <span className="text-xs text-gray-400 font-medium">Plate</span>
                  </div>
                  <span className="text-sm text-[#D6B25E] font-mono font-bold">{driver.plate_number}</span>
                </div>
              )}
            </div>
          </div>
        )}

        
        {/* Location & Status */}
        <div className="space-y-3">
          <div className="rounded-xl bg-gradient-to-br from-[#101824] via-[#0F1419] to-[#0A0E14] p-4 border border-gray-800/50 hover:border-[#D6B25E]/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[#D6B25E]/10 border border-[#D6B25E]/20">
                <MapPin className="h-4 w-4 text-[#D6B25E]" />
              </div>
              <h5 className="text-sm font-semibold text-[#E8EEF6]">Location Details</h5>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A0E14]/50 border border-gray-800/30 hover:border-yellow-400 hover:bg-yellow-400/20 transition-all duration-200 cursor-pointer">
                <div className="flex items-center gap-2">
                  <StatusDot color="yellow" />
                  <span className="text-xs text-gray-400 font-medium">Coordinates</span>
                </div>
                <span className="text-xs text-[#E8EEF6] font-mono font-medium">
                  {driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A0E14]/50 border border-gray-800/30 hover:border-yellow-400 hover:bg-yellow-400/20 transition-all duration-200 cursor-pointer">
                <div className="flex items-center gap-2">
                  <StatusDot color="yellow" pulse />
                  <span className="text-xs text-gray-400 font-medium">Last Update</span>
                </div>
                <span className="text-xs text-[#E8EEF6] font-medium">{formatTime(driver.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
