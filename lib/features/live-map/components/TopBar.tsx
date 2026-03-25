"use client";

import { LiveDriver } from "../types";

interface TopBarProps {
  drivers: LiveDriver[];
  autoRefresh: boolean;
  onAutoRefreshToggle: () => void;
  focusFilter: "all" | "online" | "in_trip";
  onFocusChange: (filter: "all" | "online" | "in_trip") => void;
}

export function TopBar({
  drivers,
  autoRefresh,
  onAutoRefreshToggle,
  focusFilter,
  onFocusChange,
}: TopBarProps) {
  const totalDrivers = drivers.length;
  const onlineDrivers = drivers.filter(d => d.computed_status === "ONLINE_IDLE").length;
  const inTripDrivers = drivers.filter(d => d.computed_status === "ON_TRIP").length;

  return (
    <div className="sticky top-0 z-50 border-b border-gray-800 bg-[#0B0F14] px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Title + Subtitle + Live Indicator */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-[#E8EEF6]">Live Map</h1>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-green-500">LIVE</span>
            </div>
          </div>
          <p className="text-sm text-gray-400">Real-time driver locations and active rides</p>
        </div>

        {/* Center: Stats Cards */}
        <div className="flex items-center gap-3">
          {/* Total Card */}
          <div className="px-4 py-2 rounded-lg bg-[#101824] border border-gray-800/50 hover:border-gray-700 transition-colors">
            <div className="text-center">
              <div className="text-xl font-bold text-[#E8EEF6]">{totalDrivers}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Total</div>
            </div>
          </div>
          
          {/* Online Card */}
          <div className="px-4 py-2 rounded-lg bg-[#D6B25E]/10 border border-[#D6B25E]/30 hover:border-[#D6B25E]/50 transition-colors">
            <div className="text-center">
              <div className="text-xl font-bold text-[#D6B25E]">{onlineDrivers}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Online</div>
            </div>
          </div>
          
          {/* In Trip Card */}
          <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 hover:border-red-500/50 transition-colors">
            <div className="text-center">
              <div className="text-xl font-bold text-red-500">{inTripDrivers}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">In Trip</div>
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-4">
          {/* Auto Refresh Toggle */}
          <button
            onClick={onAutoRefreshToggle}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              autoRefresh
                ? "bg-[#D6B25E] text-[#0B0F14]"
                : "bg-[#101824] text-gray-400 hover:text-[#E8EEF6]"
            }`}
          >
            Auto Refresh {autoRefresh ? "ON" : "OFF"}
          </button>

          {/* Focus Dropdown */}
          <select
            value={focusFilter}
            onChange={(e) => onFocusChange(e.target.value as any)}
            className="rounded-lg bg-[#101824] px-4 py-2 text-sm font-medium text-[#E8EEF6] border border-gray-800 focus:border-[#D6B25E] focus:outline-none [color-scheme:dark]"
            style={{ colorScheme: 'dark' }}
          >
            <option value="all" className="bg-[#101824] text-[#E8EEF6]">All Drivers</option>
            <option value="online" className="bg-[#101824] text-[#E8EEF6]">Online Only</option>
            <option value="in_trip" className="bg-[#101824] text-[#E8EEF6]">In Trip Only</option>
          </select>
        </div>
      </div>
    </div>
  );
}
