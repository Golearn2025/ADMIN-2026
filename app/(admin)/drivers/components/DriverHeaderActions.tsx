"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Ban, XCircle, MoreVertical, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    // Only check compliance for first-time approval (pending status)
    if (driver.status !== "suspended" && driver.status !== "inactive" && driver.compliance_status !== "ok") {
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

  // Can activate if not already approved (includes suspended, inactive, pending)
  const canApprove = driver.status !== "approved";
  // Can suspend if currently approved (active)
  const canSuspend = driver.status === "approved";
  // Can deactivate if not already inactive
  const canDeactivate = driver.status !== "inactive";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={isProcessing}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canApprove && (
            <DropdownMenuItem onClick={handleApprove}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Set Active
            </DropdownMenuItem>
          )}
          {canSuspend && (
            <DropdownMenuItem onClick={handleSuspend}>
              <Ban className="h-4 w-4 mr-2" />
              Suspend
            </DropdownMenuItem>
          )}
          {canDeactivate && (
            <DropdownMenuItem onClick={handleDeactivate}>
              <XCircle className="h-4 w-4 mr-2" />
              Deactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DriverActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
        driverName={driver.full_name || "Driver"}
        onConfirm={handleConfirmAction}
        isProcessing={isProcessing}
      />
    </>
  );
}
