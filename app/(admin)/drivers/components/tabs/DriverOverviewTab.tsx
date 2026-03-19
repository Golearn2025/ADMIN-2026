"use client";

import { Badge } from "@/components/ui/badge";
import type { Driver } from "@/lib/features/drivers/drivers.types";

interface DriverOverviewTabProps {
  driver: Driver;
}

export function DriverOverviewTab({ driver }: DriverOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Driver Information</h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Name</dt>
            <dd className="mt-1 text-sm">
              {driver.first_name} {driver.last_name}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Email</dt>
            <dd className="mt-1 text-sm">{driver.email || "N/A"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
            <dd className="mt-1 text-sm">{driver.phone}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Status</dt>
            <dd className="mt-1">
              <div className="flex gap-2">
                {driver.is_active && <Badge variant="default">Active</Badge>}
                {driver.is_approved && <Badge variant="default">Approved</Badge>}
                {!driver.is_active && <Badge variant="outline">Inactive</Badge>}
              </div>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Onboarding Status
            </dt>
            <dd className="mt-1 text-sm capitalize">{driver.onboarding_status}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Can Receive Jobs
            </dt>
            <dd className="mt-1">
              <Badge variant={driver.can_receive_jobs ? "default" : "destructive"}>
                {driver.can_receive_jobs ? "Yes" : "No"}
              </Badge>
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Compliance Status</h3>
        <div className="space-y-3">
          <ComplianceItem
            label="Missing Driver Documents"
            value={driver.missing_driver_docs}
            isIssue={driver.missing_driver_docs > 0}
          />
          <ComplianceItem
            label="Missing Vehicle Documents"
            value={driver.missing_vehicle_docs}
            isIssue={driver.missing_vehicle_docs > 0}
          />
          <ComplianceItem
            label="Expired Driver Documents"
            value={driver.expired_driver_docs}
            isIssue={driver.expired_driver_docs > 0}
          />
          <ComplianceItem
            label="Expired Vehicle Documents"
            value={driver.expired_vehicle_docs}
            isIssue={driver.expired_vehicle_docs > 0}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

function ComplianceItem({
  label,
  value,
  isIssue,
}: {
  label: string;
  value: number;
  isIssue: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Badge variant={isIssue ? "destructive" : "default"}>
        {value}
      </Badge>
    </div>
  );
}
