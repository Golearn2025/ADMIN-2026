"use client";

import { useState } from "react";
import { useDriversPage } from "@/lib/features/drivers/hooks/useDriversPage";
import { DriversSidebarList } from "./components/DriversSidebarList";
import { DriverWorkspace } from "./components/DriverWorkspace";
import { DriversPageHeader } from "./components/DriversPageHeader";
import { DriverActionDialog } from "./components/DriverActionDialog";
import { useToast } from "@/hooks/use-toast";

type FilterTab = 'all' | 'pending' | 'approved' | 'suspended' | 'inactive' | 'missing_docs' | 'expiring';

export default function DriversPage() {
  const driversState = useDriversPage();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"suspend" | "deactivate">("suspend");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Calculate filter counts - NO calculations, use view data
  const totalCount = driversState.drivers.length;
  const pendingCount = driversState.drivers.filter(d => d.onboarding_status === 'review').length;
  const approvedCount = driversState.drivers.filter(d => d.status === 'approved').length;
  const suspendedCount = driversState.drivers.filter(d => d.status === 'suspended').length;
  const inactiveCount = driversState.drivers.filter(d => d.status === 'inactive').length;
  const missingDocsCount = driversState.drivers.filter(d => d.compliance_status === 'missing').length;
  const expiringCount = driversState.drivers.filter(d => (d.documents_expired ?? 0) > 0).length;

  // Filter drivers based on active filter - use view data, NO calculations
  const filteredDrivers = (() => {
    switch (activeFilter) {
      case 'pending':
        return driversState.drivers.filter(d => d.onboarding_status === 'review');
      case 'approved':
        return driversState.drivers.filter(d => d.status === 'approved');
      case 'suspended':
        return driversState.drivers.filter(d => d.status === 'suspended');
      case 'inactive':
        return driversState.drivers.filter(d => d.status === 'inactive');
      case 'missing_docs':
        return driversState.drivers.filter(d => d.compliance_status === 'missing');
      case 'expiring':
        return driversState.drivers.filter(d => (d.documents_expired ?? 0) > 0);
      default:
        return driversState.drivers;
    }
  })();

  const handleApprove = async () => {
    if (!driversState.selectedDriverId) {
      toast({
        title: "No Driver Selected",
        description: "Please select a driver first.",
        variant: "destructive",
      });
      return;
    }

    const selectedDriver = driversState.drivers.find(d => d.id === driversState.selectedDriverId);
    if (!selectedDriver) return;

    if (selectedDriver.compliance_status !== "ok") {
      toast({
        title: "Cannot Approve Driver",
        description: `Driver compliance status is '${selectedDriver.compliance_status}'. Only drivers with 'ok' compliance can be approved.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/drivers/${driversState.selectedDriverId}/approve`, {
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
      driversState.refetch();
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
    if (!driversState.selectedDriverId) {
      toast({
        title: "No Driver Selected",
        description: "Please select a driver first.",
        variant: "destructive",
      });
      return;
    }
    setDialogAction("suspend");
    setDialogOpen(true);
  };

  const handleDeactivate = () => {
    if (!driversState.selectedDriverId) {
      toast({
        title: "No Driver Selected",
        description: "Please select a driver first.",
        variant: "destructive",
      });
      return;
    }
    setDialogAction("deactivate");
    setDialogOpen(true);
  };

  const handleConfirmAction = async (reason: string) => {
    if (!driversState.selectedDriverId) return;

    setIsProcessing(true);
    try {
      const endpoint = dialogAction === "suspend" ? "suspend" : "deactivate";
      const response = await fetch(`/api/admin/drivers/${driversState.selectedDriverId}/${endpoint}`, {
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
      driversState.refetch();
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

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Page Header with Filters and Actions */}
      <DriversPageHeader
        totalCount={totalCount}
        pendingCount={pendingCount}
        approvedCount={approvedCount}
        suspendedCount={suspendedCount}
        inactiveCount={inactiveCount}
        missingDocsCount={missingDocsCount}
        expiringCount={expiringCount}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Content: Sidebar + Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Drivers List */}
        <div className="w-80 border-r border-border bg-card">
          <DriversSidebarList
            {...driversState}
            drivers={filteredDrivers}
            onFiltersChange={driversState.setAdvancedFilters}
          />
        </div>

        {/* Main Workspace */}
        <div className="flex-1 overflow-auto">
          <DriverWorkspace
            selectedDriverId={driversState.selectedDriverId}
            onRefresh={driversState.refetch}
          />
        </div>
      </div>

      <DriverActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
        driverName={driversState.drivers.find(d => d.id === driversState.selectedDriverId)?.full_name || "Driver"}
        onConfirm={handleConfirmAction}
        isProcessing={isProcessing}
      />
    </div>
  );
}
