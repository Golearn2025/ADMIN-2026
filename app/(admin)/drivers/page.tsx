"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useDriversPage } from "@/lib/features/drivers/hooks/useDriversPage";
import { DriversSidebarList } from "./components/DriversSidebarList";
import { DriverWorkspace } from "./components/DriverWorkspace";
import { DriversPageHeader } from "./components/DriversPageHeader";
import { DriverActionDialog } from "./components/DriverActionDialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  countDriversByTab,
  filterDriversByTab,
  type DriverFilterTab,
} from "@/lib/features/drivers/driverFilters";
import { cn } from "@/lib/utils";

const EMPTY_DRIVER_FORM = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  invite: true,
};

export default function DriversPage() {
  const driversState = useDriversPage();
  const [activeFilter, setActiveFilter] = useState<DriverFilterTab>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"suspend" | "deactivate">("suspend");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_DRIVER_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const counts = countDriversByTab(driversState.drivers);
  const filteredDrivers = filterDriversByTab(driversState.drivers, activeFilter);

  useEffect(() => {
    if (driversState.selectedDriverId) {
      setMobileShowDetail(true);
    }
  }, [driversState.selectedDriverId]);

  const handleSelectDriver = (id: string) => {
    driversState.setSelectedDriverId(id);
    setMobileShowDetail(true);
  };

  const handleBackToList = () => {
    setMobileShowDetail(false);
    driversState.setSelectedDriverId(null);
  };

  const handleConfirmAction = async (reason: string) => {
    if (!driversState.selectedDriverId) return;

    setIsProcessing(true);
    try {
      const endpoint = dialogAction === "suspend" ? "suspend" : "deactivate";
      const response = await fetch(
        `/api/admin/drivers/${driversState.selectedDriverId}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${dialogAction} driver`);
      }

      toast({
        title: `Driver ${dialogAction === "suspend" ? "Suspended" : "Deactivated"}`,
        description: `Driver has been successfully ${dialogAction === "suspend" ? "suspended" : "deactivated"}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : `Failed to ${dialogAction} driver`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddDriver = async () => {
    setAddError(null);
    const email = addForm.email.trim().toLowerCase();
    const firstName = addForm.first_name.trim();
    const lastName = addForm.last_name.trim();

    if (!email || !email.includes("@")) {
      setAddError("Enter a valid email address");
      return;
    }
    if (!firstName) {
      setAddError("First name is required");
      return;
    }
    if (!lastName) {
      setAddError("Last name is required");
      return;
    }

    setAddSubmitting(true);
    try {
      const response = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          phone: addForm.phone.trim() || undefined,
          invite: addForm.invite,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setAddError(result.error || "Failed to create driver");
        return;
      }

      setAddOpen(false);
      setAddForm(EMPTY_DRIVER_FORM);
      driversState.refetch();
      toast({
        title: "Driver created",
        description: result.warning
          ? `Driver added with note: ${result.warning}`
          : "Driver has been added successfully.",
      });
    } catch (error) {
      console.error("Add driver error:", error);
      setAddError("Failed to create driver");
    } finally {
      setAddSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <DriversPageHeader
        totalCount={counts.all}
        pendingCount={counts.pending}
        approvedCount={counts.approved}
        suspendedCount={counts.suspended}
        inactiveCount={counts.inactive}
        missingDocsCount={counts.missing_docs}
        noDocsCount={counts.no_docs}
        expiringCount={counts.expiring}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onAddDriver={() => setAddOpen(true)}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "flex min-h-0 flex-col border-r border-border bg-card",
            "w-full md:w-80 md:shrink-0",
            mobileShowDetail ? "hidden md:flex" : "flex"
          )}
        >
          <DriversSidebarList
            {...driversState}
            drivers={filteredDrivers}
            selectedDriverId={driversState.selectedDriverId}
            setSelectedDriverId={handleSelectDriver}
            onFiltersChange={driversState.setAdvancedFilters}
          />
        </div>

        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            !mobileShowDetail && "hidden md:flex"
          )}
        >
          {mobileShowDetail && (
            <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2 md:hidden">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={handleBackToList}
              >
                <ArrowLeft className="h-4 w-4" />
                Înapoi la listă
              </Button>
            </div>
          )}
          <div className="relative min-h-0 flex-1 overflow-auto pb-20 md:pb-0">
            <DriverWorkspace
              selectedDriverId={driversState.selectedDriverId}
              onRefresh={() => {
                driversState.refetch();
              }}
            />
          </div>
        </div>
      </div>

      <DriverActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
        driverName={
          driversState.drivers.find((d) => d.id === driversState.selectedDriverId)
            ?.full_name || "Driver"
        }
        onConfirm={handleConfirmAction}
        isProcessing={isProcessing}
      />

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setAddError(null);
            setAddForm(EMPTY_DRIVER_FORM);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Driver</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-driver-email">Email</Label>
              <Input
                id="add-driver-email"
                type="email"
                className="w-full"
                placeholder="driver@email.com"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, email: e.target.value }))
                }
                disabled={addSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-driver-first">First name</Label>
              <Input
                id="add-driver-first"
                className="w-full"
                value={addForm.first_name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, first_name: e.target.value }))
                }
                disabled={addSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-driver-last">Last name</Label>
              <Input
                id="add-driver-last"
                className="w-full"
                value={addForm.last_name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, last_name: e.target.value }))
                }
                disabled={addSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-driver-phone">Phone</Label>
              <Input
                id="add-driver-phone"
                className="w-full"
                type="tel"
                value={addForm.phone}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, phone: e.target.value }))
                }
                disabled={addSubmitting}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="add-driver-invite"
                checked={addForm.invite}
                onCheckedChange={(checked) =>
                  setAddForm((f) => ({ ...f, invite: checked === true }))
                }
                disabled={addSubmitting}
              />
              <Label htmlFor="add-driver-invite" className="font-normal">
                Invite to driver portal
              </Label>
            </div>
            {addError ? (
              <p className="text-sm text-destructive">{addError}</p>
            ) : null}
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setAddOpen(false)}
              disabled={addSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleAddDriver}
              disabled={addSubmitting}
            >
              {addSubmitting ? "Creating…" : "Create driver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
