"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User } from "lucide-react";
import type { Driver } from "@/lib/features/drivers/drivers.types";

interface DriversSidebarListProps {
  drivers: Driver[];
  selectedDriverId: string | null;
  setSelectedDriverId: (id: string) => void;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function DriversSidebarList({
  drivers,
  selectedDriverId,
  setSelectedDriverId,
  isLoading,
  searchQuery,
  setSearchQuery,
}: DriversSidebarListProps) {
  const getComplianceBadgeVariant = (status: string) => {
    switch (status) {
      case "ok":
        return "default";
      case "pending":
        return "secondary";
      case "missing_driver_docs":
      case "missing_vehicle_docs":
      case "expired":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold">Drivers</h2>
        <p className="text-sm text-muted-foreground">
          {drivers.length} total
        </p>
      </div>

      {/* Search */}
      <div className="border-b border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search drivers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Drivers List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">Loading drivers...</p>
          </div>
        ) : drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <User className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium">No drivers found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {drivers.map((driver) => (
              <button
                key={driver.id}
                onClick={() => setSelectedDriverId(driver.id)}
                className={`w-full p-4 text-left transition-colors hover:bg-accent ${
                  selectedDriverId === driver.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {driver.first_name} {driver.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {driver.email || driver.phone}
                    </p>
                  </div>
                  <Badge
                    variant={getComplianceBadgeVariant(driver.compliance_status)}
                    className="text-xs shrink-0"
                  >
                    {driver.compliance_status}
                  </Badge>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {driver.total_driver_docs} docs
                  </span>
                  <span>•</span>
                  <span>
                    {driver.total_vehicles} vehicle{driver.total_vehicles !== 1 ? "s" : ""}
                  </span>
                  {driver.pending_driver_docs > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-yellow-600">
                        {driver.pending_driver_docs} pending
                      </span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
