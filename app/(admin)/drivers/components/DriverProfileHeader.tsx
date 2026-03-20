"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Mail, Phone, Building2, Car } from "lucide-react";
import type { Driver } from "@/lib/features/drivers/drivers.types";

interface DriverProfileHeaderProps {
  driver: Driver;
}

export function DriverProfileHeader({ driver }: DriverProfileHeaderProps) {
  const getComplianceBadge = () => {
    switch (driver.compliance_status) {
      case "ok":
        return <Badge variant="success">Compliant</Badge>;
      case "missing":
        return <Badge variant="destructive">Missing Documents</Badge>;
      case "no_vehicle":
        return <Badge variant="warning">No Vehicle</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired Documents</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getOnboardingBadge = () => {
    switch (driver.onboarding_status) {
      case "complete":
        return <Badge variant="success">Complete</Badge>;
      case "review":
        return <Badge variant="warning">In Review</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <Avatar
          src={driver.profile_photo_url}
          fallback={driver.full_name}
          className="h-20 w-20 text-2xl"
        />

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div>
                <h2 className="text-2xl font-bold">
                  {driver.full_name}
                </h2>
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  {driver.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      {driver.email}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    {driver.phone}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>Org: {driver.organization_id.slice(0, 8)}...</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Car className="h-4 w-4" />
                  <span>{driver.total_vehicles} {driver.total_vehicles === 1 ? 'Vehicle' : 'Vehicles'}</span>
                </div>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-col items-end gap-2">
              {getComplianceBadge()}
              {getOnboardingBadge()}
              {driver.is_active ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {driver.can_receive_jobs && (
                <Badge variant="default">Can Receive Jobs</Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
