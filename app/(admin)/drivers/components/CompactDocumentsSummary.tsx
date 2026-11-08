"use client";

import { CheckCircle, AlertTriangle, XCircle, FileText, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CompactDocumentsSummaryProps {
  totalRequired: number;
  approved: number;
  pending: number;
  missing: number;
  expired?: number;
  driverRequired: number;
  vehiclePaperRequired: number;
  vehiclePhotoRequired: number;
  vehicles: number;
  readyToReview?: boolean;
  readyToApprove?: boolean;
}

function StatCard({
  icon: Icon,
  iconClass,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-center min-w-0">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 w-full">
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>
      </div>
    </div>
  );
}

export function CompactDocumentsSummary({
  totalRequired,
  approved,
  pending,
  missing,
  expired = 0,
  driverRequired,
  vehiclePaperRequired,
  vehiclePhotoRequired,
  vehicles,
  readyToReview = false,
  readyToApprove = false,
}: CompactDocumentsSummaryProps) {
  const hasIssues = expired > 0 || missing > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-lg md:p-6">
      <div className="flex flex-col items-center gap-2 mb-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-semibold">Documents Overview</h3>
        </div>
        {readyToApprove && (
          <Badge variant="success" className="gap-1 shrink-0">
            <CheckCircle className="h-3 w-3" />
            Ready to approve
          </Badge>
        )}
        {!readyToApprove && readyToReview && (
          <Badge variant="secondary" className="gap-1 shrink-0">
            <Clock className="h-3 w-3" />
            All uploaded — review
          </Badge>
        )}
        {!readyToApprove && !readyToReview && hasIssues && (
          <Badge variant="destructive" className="gap-1 shrink-0">
            <AlertTriangle className="h-3 w-3" />
            {missing} missing of {totalRequired}
          </Badge>
        )}
      </div>

      <p className="mb-4 text-center text-xs text-muted-foreground sm:text-left">
        Activation package:{" "}
        <span className="font-medium text-foreground">{totalRequired} required</span>
        {" = "}
        {driverRequired} driver docs + {vehiclePaperRequired} car docs +{" "}
        {vehiclePhotoRequired} car photos
        {vehicles === 0 ? " · no vehicle yet (car slots count as missing)" : ""}
        {" · "}
        <span className="font-medium text-foreground">
          {approved + pending}/{totalRequired} uploaded
        </span>
        {" · "}
        Hire Agreement optional
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatCard
          icon={FileText}
          iconClass="bg-blue-500/10 text-blue-500"
          label="Total required"
          value={totalRequired}
          sub="driver + car"
        />
        <StatCard
          icon={CheckCircle}
          iconClass="bg-green-500/10 text-green-500"
          label="Approved"
          value={approved}
          sub="valid"
        />
        <StatCard
          icon={Clock}
          iconClass="bg-amber-500/10 text-amber-500"
          label="In review"
          value={pending}
          sub="pending"
        />
        <StatCard
          icon={XCircle}
          iconClass="bg-red-500/10 text-red-500"
          label="Missing"
          value={missing}
          sub={expired > 0 ? `${expired} expired` : "not uploaded"}
        />
      </div>
    </div>
  );
}
