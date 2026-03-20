"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Ban, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Driver } from "@/lib/features/drivers/drivers.types";
import { DriverActionDialog } from "./DriverActionDialog";

interface DriverHeaderActionsProps {
  driver: Driver;
  onRefresh: () => void;
}

export function DriverHeaderActions({ driver, onRefresh }: DriverHeaderActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"suspend" | "deactivate">("suspend");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleApprove = async () => {
    if (driver.compliance_status !== "ok") {
      toast({
        title: "Cannot Approve Driver",
        description: `Driver compliance status is '${driver.compliance_status}'. Only drivers with 'ok' compliance can be approved.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/drivers/${driver.id}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve driver");
      }

      toast({
        title: "Driver Approved",
        description: "Driver has been successfully approved.",
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve driver",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspend = () => {
    setDialogAction("suspend");
    setDialogOpen(true);
  };

  const handleDeactivate = () => {
    setDialogAction("deactivate");
    setDialogOpen(true);
  };

  const handleConfirmAction = async (reason: string) => {
    setIsProcessing(true);
    try {
      const endpoint = dialogAction === "suspend" ? "suspend" : "deactivate";
      const response = await fetch(`/api/admin/drivers/${driver.id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${dialogAction} driver`);
      }

      toast({
        title: `Driver ${dialogAction === "suspend" ? "Suspended" : "Deactivated"}`,
        description: `Driver has been successfully ${dialogAction === "suspend" ? "suspended" : "deactivated"}.`,
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${dialogAction} driver`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const canApprove = driver.status !== "approved" && driver.compliance_status === "ok";
  const canSuspend = driver.status !== "suspended";
  const canDeactivate = driver.status !== "inactive";

  return (
    <>
      <div className="flex items-center gap-2">
        {canApprove && (
          <Button
            size="sm"
            variant="default"
            onClick={handleApprove}
            disabled={isProcessing}
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
        )}

        {canSuspend && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSuspend}
            disabled={isProcessing}
          >
            <Ban className="h-4 w-4 mr-1" />
            Suspend
          </Button>
        )}

        {canDeactivate && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleDeactivate}
            disabled={isProcessing}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Deactivate
          </Button>
        )}
      </div>

      <DriverActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
        driverName={driver.full_name}
        onConfirm={handleConfirmAction}
        isProcessing={isProcessing}
      />
    </>
  );
}
