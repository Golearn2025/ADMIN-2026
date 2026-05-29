"use client";

import { CheckCircle, AlertTriangle, XCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CompactDocumentsSummaryProps {
  approved: number;
  expired: number;
  missing: number;
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
  approved,
  expired,
  missing,
}: CompactDocumentsSummaryProps) {
  const total = approved + expired + missing;
  const isCompliant = expired === 0 && missing === 0 && approved > 0;
  const hasIssues = expired > 0 || missing > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-lg md:p-6">
      <div className="flex flex-col items-center gap-2 mb-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-semibold">Documents Overview</h3>
        </div>
        {isCompliant && (
          <Badge variant="success" className="gap-1 shrink-0">
            <CheckCircle className="h-3 w-3" />
            All Valid
          </Badge>
        )}
        {hasIssues && (
          <Badge variant="destructive" className="gap-1 shrink-0">
            <AlertTriangle className="h-3 w-3" />
            Action Required
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatCard
          icon={FileText}
          iconClass="bg-blue-500/10 text-blue-500"
          label="Total"
          value={total}
          sub="documents"
        />
        <StatCard
          icon={CheckCircle}
          iconClass="bg-green-500/10 text-green-500"
          label="Approved"
          value={approved}
          sub="valid"
        />
        <StatCard
          icon={AlertTriangle}
          iconClass="bg-orange-500/10 text-orange-500"
          label="Expired"
          value={expired}
          sub="renew"
        />
        <StatCard
          icon={XCircle}
          iconClass="bg-red-500/10 text-red-500"
          label="Missing"
          value={missing}
          sub="upload"
        />
      </div>
    </div>
  );
}
