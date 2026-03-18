"use client";

import { useDriversPage } from "@/lib/features/drivers/hooks/useDriversPage";
import { DriversSidebarList } from "./components/DriversSidebarList";
import { DriverWorkspace } from "./components/DriverWorkspace";
import { useEffect, useState } from "react";

export default function DriversPage() {
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrgId() {
      try {
        const response = await fetch("/api/admin/organization");
        if (response.ok) {
          const data = await response.json();
          setOrgId(data.organizationId);
        }
      } catch (error) {
        console.error("Failed to fetch organization ID:", error);
      }
    }
    fetchOrgId();
  }, []);

  const driversState = useDriversPage({
    organizationId: orgId || "",
  });

  if (!orgId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Drivers List */}
      <div className="w-80 border-r border-border bg-card">
        <DriversSidebarList {...driversState} />
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-auto">
        <DriverWorkspace
          selectedDriver={driversState.selectedDriver}
          onRefresh={driversState.refetch}
        />
      </div>
    </div>
  );
}
