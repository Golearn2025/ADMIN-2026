"use client";

import { useEffect, useState } from "react";
import { ActivityTimeline } from "../ActivityTimeline";
import type { ActivityLog } from "@/lib/features/drivers/activity.types";
import { apiFetch } from "@/lib/api/apiClient";

interface DriverActivityTabProps {
  driverId: string;
  organizationId: string;
}

export function DriverActivityTab({
  driverId,
  organizationId,
}: DriverActivityTabProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivityLogs();
  }, [driverId]);

  const fetchActivityLogs = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/admin/drivers/${driverId}/activity`);

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/5 bg-[#0B0F14] p-6 shadow-lg">
      <ActivityTimeline logs={logs} />
    </div>
  );
}
