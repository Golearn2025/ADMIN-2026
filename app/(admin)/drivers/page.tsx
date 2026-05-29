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
import {
  countDriversByTab,
  filterDriversByTab,
  type DriverFilterTab,
} from "@/lib/features/drivers/driverFilters";
import { cn } from "@/lib/utils";

export default function DriversPage() {
  const driversState = useDriversPage();
  const [activeFilter, setActiveFilter] = useState<DriverFilterTab>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"suspend" | "deactivate">("suspend");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const { toast } = useToast();

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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <DriversPageHeader
        totalCount={counts.all}
        pendingCount={counts.pending}
        approvedCount={counts.approved}
        suspendedCount={counts.suspended}
        inactiveCount={counts.inactive}
        missingDocsCount={counts.missing_docs}
        expiringCount={counts.expiring}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
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
    </div>
  );
}
