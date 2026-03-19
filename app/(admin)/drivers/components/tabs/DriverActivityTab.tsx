"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import type { DocumentStatusLog } from "@/lib/features/drivers/drivers.types";

interface DriverActivityTabProps {
  driverId: string;
  organizationId: string;
}

export function DriverActivityTab({
  driverId,
  organizationId,
}: DriverActivityTabProps) {
  const [logs, setLogs] = useState<DocumentStatusLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivityLogs();
  }, [driverId]);

  const fetchActivityLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/drivers/${driverId}/activity?organizationId=${organizationId}`
      );

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
        <p className="text-muted-foreground">Loading activity...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Activity className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-2 text-sm font-medium">No activity yet</p>
        <p className="text-xs text-muted-foreground">
          Document status changes will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Activity className="h-5 w-5" />
          Activity Timeline
        </h3>

        <div className="space-y-4">
          {logs.map((log) => (
            <ActivityLogItem key={log.id} log={log} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityLogItem({ log }: { log: DocumentStatusLog }) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "success";
      case "pending":
        return "warning";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="relative flex items-start gap-4 pb-4 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-6 h-full w-0.5 bg-border last:hidden" />
      
      {/* Timeline dot */}
      <div className="relative z-10 mt-1.5 h-6 w-6 shrink-0 rounded-full border-2 border-border bg-card flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-primary" />
      </div>

      <div className="flex-1 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={getStatusBadgeVariant(log.old_status)}>
            {log.old_status}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant={getStatusBadgeVariant(log.new_status)}>
            {log.new_status}
          </Badge>
        </div>
        
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{new Date(log.created_at).toLocaleString()}</span>
          {log.changed_by && (
            <>
              <span>•</span>
              <span>by {log.changed_by}</span>
            </>
          )}
        </div>

        {log.reason && (
          <p className="mt-2 rounded-md bg-muted/50 p-2 text-sm">
            <span className="font-medium">Reason:</span> {log.reason}
          </p>
        )}
      </div>
    </div>
  );
}
