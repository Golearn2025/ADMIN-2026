"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Ban, XCircle, MoreVertical, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { Driver } from "@/lib/features/drivers/drivers.types";
import { DriverActionDialog } from "./DriverActionDialog";
import { cn } from "@/lib/utils";

interface DriverHeaderActionsProps {
  driver: Driver;
  onRefresh: () => void;
  /** Bara fixă jos pe mobil (activare rapidă) */
  mobileSticky?: boolean;
}

export function DriverHeaderActions({
  driver,
  onRefresh,
  mobileSticky = false,
}: DriverHeaderActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"suspend" | "deactivate">("suspend");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleApprove = async () => {
    if (driver.compliance_status !== "ok") {
      const detail =
        driver.compliance_status === "missing"
          ? `Lipsesc ${(driver.total_required_docs ?? 0) - (driver.total_approved_docs ?? 0)} documente obligatorii aprobate.`
          : driver.compliance_status === "no_vehicle"
            ? "Șoferul nu are vehicul înregistrat."
            : driver.compliance_status === "expired"
              ? "Există documente expirate."
              : "";
      toast({
        title: "Nu poți activa șoferul",
        description: `Compliance: '${driver.compliance_status}'. ${detail} Toate documentele obligatorii trebuie încărcate și aprobate.`,
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
        title: "Șofer activat",
        description: "Șoferul a fost aprobat cu succes.",
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "Activarea a eșuat",
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
        title: dialogAction === "suspend" ? "Suspendat" : "Dezactivat",
        description: "Statusul a fost actualizat.",
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "Acțiunea a eșuat",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const canApprove =
    driver.status !== "approved" && driver.status !== "active";
  const canSuspend = driver.status === "approved" || driver.status === "active";
  const canDeactivate = driver.status !== "inactive";

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={isProcessing} aria-label="Mai multe acțiuni">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60]">
        {canApprove && (
          <DropdownMenuItem onClick={handleApprove} className="md:hidden">
            <CheckCircle className="mr-2 h-4 w-4" />
            Set Active
          </DropdownMenuItem>
        )}
        {canSuspend && (
          <DropdownMenuItem onClick={handleSuspend}>
            <Ban className="mr-2 h-4 w-4" />
            Suspend
          </DropdownMenuItem>
        )}
        {canDeactivate && (
          <DropdownMenuItem onClick={handleDeactivate}>
            <XCircle className="mr-2 h-4 w-4" />
            Deactivate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (mobileSticky) {
    return (
      <>
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 p-3 backdrop-blur md:hidden",
            "safe-area-pb"
          )}
        >
          <div className="mx-auto flex max-w-lg gap-2">
            {canApprove && (
              <Button
                className="min-h-11 flex-1 gap-2"
                disabled={isProcessing}
                onClick={handleApprove}
              >
                <CheckCircle className="h-4 w-4" />
                Activează șofer
              </Button>
            )}
            {(canSuspend || canDeactivate || canApprove) && (
              <div className="shrink-0">{menu}</div>
            )}
          </div>
        </div>
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

  return (
    <>
      <div className="hidden items-center gap-2 md:flex">
        {canApprove && (
          <Button size="sm" disabled={isProcessing} onClick={handleApprove}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Set Active
          </Button>
        )}
        {menu}
      </div>
      <div className="md:hidden">{menu}</div>

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
