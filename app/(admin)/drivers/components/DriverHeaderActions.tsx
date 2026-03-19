"use client";

import { Button } from "@/components/ui/button";
import { Check, Lock, Clock, Ban, X } from "lucide-react";
import type { Driver } from "@/lib/features/drivers/drivers.types";

interface DriverHeaderActionsProps {
  driver: Driver;
  onAction: (action: string) => void;
}

export function DriverHeaderActions({ driver, onAction }: DriverHeaderActionsProps) {
  const handleAction = (action: string, requiresConfirm: boolean = false) => {
    if (requiresConfirm) {
      const confirmed = window.confirm(
        `Are you sure you want to ${action} this driver?`
      );
      if (!confirmed) return;
    }
    onAction(action);
  };

  return (
    <div className="flex items-center gap-2">
      {!driver.is_approved && (
        <Button
          size="sm"
          variant="default"
          onClick={() => handleAction("approve")}
        >
          <Check className="h-4 w-4 mr-1" />
          Approve
        </Button>
      )}
      
      {driver.is_approved && !driver.can_receive_jobs && (
        <Button
          size="sm"
          variant="default"
          onClick={() => handleAction("authorize")}
        >
          <Lock className="h-4 w-4 mr-1" />
          Authorize
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction("pending", true)}
      >
        <Clock className="h-4 w-4 mr-1" />
        Put Pending
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction("suspend", true)}
      >
        <Ban className="h-4 w-4 mr-1" />
        Suspend
      </Button>

      <Button
        size="sm"
        variant="destructive"
        onClick={() => handleAction("reject", true)}
      >
        <X className="h-4 w-4 mr-1" />
        Reject
      </Button>
    </div>
  );
}
