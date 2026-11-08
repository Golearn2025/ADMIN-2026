"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Ban, XCircle, MoreVertical, CheckCircle, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleApprove = async () => {
    if (driver.compliance_status !== "ok") {
      const detail =
        driver.compliance_status === "missing"
          ? `Missing ${(driver.total_required_docs ?? 0) - (driver.total_approved_docs ?? 0)} required approved document(s).`
          : driver.compliance_status === "no_vehicle"
            ? "Driver has no registered vehicle."
            : driver.compliance_status === "expired"
              ? "There are expired documents."
              : "";
      toast({
        title: "Cannot activate driver",
        description: `Compliance: '${driver.compliance_status}'. ${detail} All required documents must be uploaded and approved.`,
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
        title: "Driver activated",
        description: "Driver has been approved successfully.",
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Activation failed",
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
        throw new Error(error.message || error.error || `Failed to ${dialogAction} driver`);
      }

      toast({
        title: dialogAction === "suspend" ? "Suspended" : "Deactivated",
        description: "Status has been updated.",
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Action failed",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/drivers/${driver.id}/sign-out`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Failed to sign out driver");
      }

      toast({
        title: "Signed out",
        description: "Driver has been signed out from all devices.",
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Sign out failed",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setSignOutOpen(false);
    }
  };

  const canApprove =
    driver.status !== "approved" && driver.status !== "active";
  const canSuspend = driver.status === "approved" || driver.status === "active";
  const canDeactivate = driver.status !== "inactive";

  const signOutDialog = (
    <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Sign out driver?</DialogTitle>
          <DialogDescription>
            {driver.full_name || "This driver"} will be signed out instantly from all phones.
            Active sessions and push tokens will be revoked.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={isProcessing} onClick={() => setSignOutOpen(false)}>
            Cancel
          </Button>
          <Button disabled={isProcessing} onClick={handleSignOut}>
            {isProcessing ? "Processing..." : "Sign out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={isProcessing} aria-label="More actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60]">
        {canApprove && (
          <DropdownMenuItem onClick={handleApprove} className="md:hidden">
            <CheckCircle className="mr-2 h-4 w-4" />
            Activate
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
        {(canSuspend || canDeactivate || canApprove) && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={() => setSignOutOpen(true)}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out (all devices)
        </DropdownMenuItem>
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
                Activate
              </Button>
            )}
            {canDeactivate && (
              <Button
                className="min-h-11 flex-1 gap-2"
                variant="secondary"
                disabled={isProcessing}
                onClick={handleDeactivate}
              >
                <XCircle className="h-4 w-4" />
                Deactivate
              </Button>
            )}
            <Button
              className="min-h-11 shrink-0 gap-2"
              variant="outline"
              disabled={isProcessing}
              onClick={() => setSignOutOpen(true)}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
            {(canSuspend || canApprove) && <div className="shrink-0">{menu}</div>}
          </div>
        </div>
        {signOutDialog}
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
      <div className="hidden flex-wrap items-center justify-end gap-2 md:flex">
        {canApprove && (
          <Button size="sm" disabled={isProcessing} onClick={handleApprove}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Activate
          </Button>
        )}
        {canSuspend && (
          <Button size="sm" variant="secondary" disabled={isProcessing} onClick={handleSuspend}>
            <Ban className="mr-2 h-4 w-4" />
            Suspend
          </Button>
        )}
        {canDeactivate && (
          <Button size="sm" variant="outline" disabled={isProcessing} onClick={handleDeactivate}>
            <XCircle className="mr-2 h-4 w-4" />
            Deactivate
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={isProcessing}
          onClick={() => setSignOutOpen(true)}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
        {menu}
      </div>
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        {canApprove && (
          <Button size="sm" className="min-h-10 flex-1" disabled={isProcessing} onClick={handleApprove}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Activate
          </Button>
        )}
        {canDeactivate && (
          <Button size="sm" className="min-h-10 flex-1" variant="secondary" disabled={isProcessing} onClick={handleDeactivate}>
            <XCircle className="mr-2 h-4 w-4" />
            Deactivate
          </Button>
        )}
        <Button size="sm" className="min-h-10" variant="outline" disabled={isProcessing} onClick={() => setSignOutOpen(true)}>
          <LogOut className="h-4 w-4" />
        </Button>
        {menu}
      </div>

      {signOutDialog}
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
