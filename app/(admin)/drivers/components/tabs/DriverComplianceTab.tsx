"use client";

import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText,
  Car,
  User,
  Clock,
  ArrowRight
} from "lucide-react";
import type { Driver } from "@/lib/features/drivers/drivers.types";

interface DriverComplianceTabProps {
  driver: Driver;
}

export function DriverComplianceTab({ driver }: DriverComplianceTabProps) {
  // Calculate valid documents (approved - expired)
  const validDocs = driver.documents_completed - driver.documents_expired;
  const missingDocs = driver.documents_required - validDocs;
  const driverDocsProgress = driver.documents_required > 0 
    ? (validDocs / driver.documents_required) * 100 
    : 0;

  // Determine compliance requirements
  const requirements = [
    {
      label: "Driver is Active",
      met: driver.is_active,
      icon: User,
    },
    {
      label: "Driver is Approved",
      met: driver.is_approved,
      icon: Shield,
    },
    {
      label: "Has Vehicle",
      met: driver.total_vehicles > 0,
      icon: Car,
      detail: driver.total_vehicles > 0 ? `${driver.total_vehicles} vehicle${driver.total_vehicles > 1 ? 's' : ''}` : undefined,
    },
    {
      label: "All Required Documents Valid",
      met: validDocs === driver.documents_required && driver.documents_expired === 0,
      icon: FileText,
      detail: `${validDocs}/${driver.documents_required} valid`,
    },
    {
      label: "No Expired Documents",
      met: driver.documents_expired === 0,
      icon: Clock,
      detail: driver.documents_expired > 0 ? `${driver.documents_expired} expired` : undefined,
    },
  ];

  const allRequirementsMet = requirements.every(req => req.met);
  const canReceiveJobs = driver.can_receive_jobs;

  // Determine issues
  const issues = [];
  if (!driver.is_active) issues.push("Driver account is inactive");
  if (!driver.is_approved) issues.push("Driver is not approved");
  if (driver.total_vehicles === 0) issues.push("No vehicle assigned");
  if (missingDocs > 0) issues.push(`${missingDocs} document${missingDocs > 1 ? 's' : ''} not approved`);
  if (driver.documents_expired > 0) issues.push(`${driver.documents_expired} document${driver.documents_expired > 1 ? 's' : ''} expired`);

  const getComplianceStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge variant="success" className="text-lg px-4 py-2">✅ Compliant</Badge>;
      case 'expired':
        return <Badge variant="destructive" className="text-lg px-4 py-2">⚠️ Expired Documents</Badge>;
      case 'missing':
        return <Badge variant="destructive" className="text-lg px-4 py-2">❌ Missing Documents</Badge>;
      case 'no_vehicle':
        return <Badge variant="warning" className="text-lg px-4 py-2">⚠️ No Vehicle</Badge>;
      default:
        return <Badge variant="secondary" className="text-lg px-4 py-2">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Overall Status */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-6 w-6 text-primary" />
            <h3 className="font-semibold">Overall Status</h3>
          </div>
          <div className="mt-4">
            {getComplianceStatusBadge(driver.compliance_status)}
          </div>
        </div>

        {/* Can Receive Jobs */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h3 className="font-semibold">Can Receive Jobs</h3>
          </div>
          <div className="mt-4">
            <Badge variant={canReceiveJobs ? "success" : "destructive"} className="text-lg px-4 py-2">
              {canReceiveJobs ? "✅ YES" : "❌ NO"}
            </Badge>
          </div>
        </div>

        {/* Driver Status */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <User className="h-6 w-6 text-primary" />
            <h3 className="font-semibold">Driver Status</h3>
          </div>
          <div className="mt-4">
            <Badge 
              variant={
                driver.driver_status === 'active' ? 'success' :
                driver.driver_status === 'inactive' ? 'secondary' :
                'warning'
              }
              className="text-lg px-4 py-2 capitalize"
            >
              {driver.driver_status === 'active' && '✅ '}
              {driver.driver_status === 'incomplete' && '⚠️ '}
              {driver.driver_status === 'pending' && '🕐 '}
              {driver.driver_status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Driver Documents Breakdown */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold">Driver Documents Compliance</h3>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-sm text-muted-foreground">Required</dt>
              <dd className="text-2xl font-bold">{driver.documents_required}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Valid</dt>
              <dd className="text-2xl font-bold text-green-600">{validDocs}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Expired</dt>
              <dd className="text-2xl font-bold text-red-600">{driver.documents_expired}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Missing</dt>
              <dd className="text-2xl font-bold text-orange-600">{missingDocs}</dd>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Valid Documents Progress</span>
              <span className="text-sm font-medium">{Math.round(driverDocsProgress)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  driver.documents_expired > 0 ? 'bg-yellow-500' :
                  driverDocsProgress === 100 ? 'bg-green-500' :
                  driverDocsProgress >= 75 ? 'bg-blue-500' :
                  driverDocsProgress >= 50 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${driverDocsProgress}%` }}
              />
            </div>
          </div>

          {/* Status */}
          <div className="pt-2">
            {driver.documents_expired > 0 ? (
              <Badge variant="destructive" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                {driver.documents_expired} Expired - {validDocs}/{driver.documents_required} Valid
              </Badge>
            ) : missingDocs > 0 ? (
              <Badge variant="warning" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                {missingDocs} Missing - {validDocs}/{driver.documents_required} Valid
              </Badge>
            ) : (
              <Badge variant="success" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                All Documents Valid ({validDocs}/{driver.documents_required})
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Vehicle Documents Breakdown */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Car className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold">Vehicle Documents Compliance</h3>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">Vehicles</dt>
              <dd className="text-2xl font-bold">{driver.total_vehicles}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd className="mt-1">
                {driver.total_vehicles === 0 ? (
                  <Badge variant="warning">No Vehicle</Badge>
                ) : (
                  <Badge variant="success">Has Vehicle</Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Compliance</dt>
              <dd className="mt-1">
                {driver.total_vehicles > 0 ? (
                  driver.compliance_status === 'ok' || driver.compliance_status === 'expired' ? (
                    <Badge variant="success">✅ Complete</Badge>
                  ) : (
                    <Badge variant="warning">⚠️ Incomplete</Badge>
                  )
                ) : (
                  <Badge variant="secondary">N/A</Badge>
                )}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold">Requirements Checklist</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-2 ml-9">
            All requirements must be met for driver to receive jobs
          </p>
        </div>

        <div className="space-y-3">
          {requirements.map((req, index) => {
            const Icon = req.icon;
            return (
              <div 
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                  req.met ? 'border-l-green-500 bg-green-500/5' : 'border-l-red-500 bg-red-500/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${req.met ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <Icon className={`h-4 w-4 ${req.met ? 'text-green-500' : 'text-red-500'}`} />
                  </div>
                  <div>
                    <p className="font-medium">{req.label}</p>
                    {req.detail && (
                      <p className="text-sm text-muted-foreground">{req.detail}</p>
                    )}
                  </div>
                </div>
                <div>
                  {req.met ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Final Result */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">Final Result</p>
              <p className="text-sm text-muted-foreground mt-1">
                {canReceiveJobs 
                  ? "Driver meets all requirements and can receive jobs"
                  : "Driver does not meet all requirements"}
              </p>
            </div>
            <Badge 
              variant={canReceiveJobs ? "success" : "destructive"}
              className="text-lg px-6 py-3"
            >
              {canReceiveJobs ? "✅ Can Receive Jobs" : "❌ Cannot Receive Jobs"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Issues & Actions */}
      {issues.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-card p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold">Issues & Required Actions</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-2 ml-9">
              The following issues prevent this driver from receiving jobs
            </p>
          </div>

          <div className="space-y-3">
            {issues.map((issue, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border-l-4 border-l-red-500 bg-red-500/5">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{issue}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action Suggestions */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="font-semibold mb-3">Recommended Actions:</p>
            <div className="space-y-2">
              {!driver.is_active && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="h-4 w-4 text-red-500" />
                  <span>Activate driver account in Details tab</span>
                </div>
              )}
              {!driver.is_approved && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="h-4 w-4 text-red-500" />
                  <span>Approve driver account</span>
                </div>
              )}
              {driver.total_vehicles === 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="h-4 w-4 text-red-500" />
                  <span>Add a vehicle in Vehicles tab</span>
                </div>
              )}
              {(missingDocs > 0 || driver.documents_expired > 0) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="h-4 w-4 text-red-500" />
                  <span>Review and approve documents in Documents tab</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {issues.length === 0 && canReceiveJobs && (
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-900">All Requirements Met!</h3>
              <p className="text-sm text-green-700 mt-1">
                This driver is fully compliant and ready to receive jobs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
