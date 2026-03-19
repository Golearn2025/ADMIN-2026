"use client";

import { useState } from "react";
import { useDriversPage } from "@/lib/features/drivers/hooks/useDriversPage";
import { DriversSidebarList } from "./components/DriversSidebarList";
import { DriverWorkspace } from "./components/DriverWorkspace";
import { DriversPageHeader } from "./components/DriversPageHeader";

type FilterTab = 'all' | 'pending' | 'approved' | 'authorized' | 'suspended' | 'missing_docs' | 'expiring' | 'rejected';

export default function DriversPage() {
  const driversState = useDriversPage();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Calculate filter counts
  const totalCount = driversState.drivers.length;
  const pendingCount = driversState.drivers.filter(d => d.onboarding_status === 'review').length;
  const approvedCount = driversState.drivers.filter(d => d.is_approved).length;
  const authorizedCount = driversState.drivers.filter(d => d.can_receive_jobs).length;
  const suspendedCount = driversState.drivers.filter(d => !d.is_active).length;
  const missingDocsCount = driversState.drivers.filter(d => d.missing_driver_docs > 0 || d.missing_vehicle_docs > 0).length;
  const expiringCount = driversState.drivers.filter(d => d.expired_driver_docs > 0 || d.expired_vehicle_docs > 0).length;
  const rejectedCount = driversState.drivers.filter(d => d.onboarding_status === 'draft' && !d.is_approved).length;

  // Filter drivers based on active filter
  const filteredDrivers = (() => {
    switch (activeFilter) {
      case 'pending':
        return driversState.drivers.filter(d => d.onboarding_status === 'review');
      case 'approved':
        return driversState.drivers.filter(d => d.is_approved);
      case 'authorized':
        return driversState.drivers.filter(d => d.can_receive_jobs);
      case 'suspended':
        return driversState.drivers.filter(d => !d.is_active);
      case 'missing_docs':
        return driversState.drivers.filter(d => d.missing_driver_docs > 0 || d.missing_vehicle_docs > 0);
      case 'expiring':
        return driversState.drivers.filter(d => d.expired_driver_docs > 0 || d.expired_vehicle_docs > 0);
      case 'rejected':
        return driversState.drivers.filter(d => d.onboarding_status === 'draft' && !d.is_approved);
      default:
        return driversState.drivers;
    }
  })();

  const handleAction = (action: string) => {
    console.log(`Action: ${action}`);
    alert(`${action} action will be implemented`);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Page Header with Filters and Actions */}
      <DriversPageHeader
        totalCount={totalCount}
        pendingCount={pendingCount}
        approvedCount={approvedCount}
        authorizedCount={authorizedCount}
        suspendedCount={suspendedCount}
        missingDocsCount={missingDocsCount}
        expiringCount={expiringCount}
        rejectedCount={rejectedCount}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onApprove={() => handleAction('Approve')}
        onAuthorize={() => handleAction('Authorize')}
        onPutPending={() => handleAction('Put Pending')}
        onSuspend={() => handleAction('Suspend')}
        onReject={() => handleAction('Reject')}
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
    </div>
  );
}
