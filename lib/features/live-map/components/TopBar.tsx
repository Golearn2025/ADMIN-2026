"use client";

import { LiveDriver } from "../types";
import {
  getLiveDriverStatus,
  LIVE_DRIVER_STATUSES,
  LIVE_DRIVER_STATUS_META,
  type LiveDriverStatus,
} from "../utils/driverStatus";

interface TopBarProps {
  drivers: LiveDriver[];
  autoRefresh: boolean;
  onAutoRefreshToggle: () => void;
  focusFilter: "all" | LiveDriverStatus;
  onFocusChange: (filter: "all" | LiveDriverStatus) => void;
}

export function TopBar({
  drivers,
  autoRefresh,
  onAutoRefreshToggle,
  focusFilter,
  onFocusChange,
}: TopBarProps) {
  const counts = LIVE_DRIVER_STATUSES.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<LiveDriverStatus, number>
  );
  for (const driver of drivers) counts[getLiveDriverStatus(driver)] += 1;

  return (
    <div className="z-20 shrink-0 border-b border-gray-800 bg-[#0B0F14] px-4 py-3 lg:px-6 lg:py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Title + Subtitle + Live Indicator */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-[#E8EEF6]">Live Map</h1>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-green-500">LIVE</span>
            </div>
          </div>
          <p className="text-sm text-gray-400">Online drivers · same trip status as Bookings</p>
        </div>

        {/* Center: Stats Cards (click to filter) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onFocusChange("all")}
            className={`rounded-lg border px-4 py-2 transition-colors ${
              focusFilter === "all"
                ? "border-[#E8EEF6]/60 bg-[#101824]"
                : "border-gray-800/50 bg-[#101824] hover:border-gray-700"
            }`}
          >
            <div className="text-center">
              <div className="text-xl font-bold text-[#E8EEF6]">{drivers.length}</div>
              <div className="text-xs uppercase tracking-wide text-gray-400">Total</div>
            </div>
          </button>

          {LIVE_DRIVER_STATUSES.map((status) => {
            const meta = LIVE_DRIVER_STATUS_META[status];
            const active = focusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => onFocusChange(active ? "all" : status)}
                className="rounded-lg border px-4 py-2 transition-colors"
                style={{
                  backgroundColor: `${meta.color}1A`,
                  borderColor: active ? meta.color : `${meta.color}4D`,
                }}
              >
                <div className="text-center">
                  <div className="text-xl font-bold" style={{ color: meta.color }}>
                    {counts[status]}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-gray-400">{meta.label}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-4">
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

          <select
            value={focusFilter}
            onChange={(e) => onFocusChange(e.target.value as "all" | LiveDriverStatus)}
            className="rounded-lg bg-[#101824] px-4 py-2 text-sm font-medium text-[#E8EEF6] border border-gray-800 focus:border-[#D6B25E] focus:outline-none [color-scheme:dark]"
            style={{ colorScheme: "dark" }}
          >
            <option value="all" className="bg-[#101824] text-[#E8EEF6]">All Drivers</option>
            {LIVE_DRIVER_STATUSES.map((status) => (
              <option key={status} value={status} className="bg-[#101824] text-[#E8EEF6]">
                {LIVE_DRIVER_STATUS_META[status].label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
