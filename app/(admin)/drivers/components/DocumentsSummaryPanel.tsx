"use client";

import { Card } from "@/components/ui/card";
import { FileText, Upload, AlertCircle, Clock, XCircle } from "lucide-react";

interface DocumentsSummaryPanelProps {
  totalRequired: number;
  uploaded: number;
  missing: number;
  expiringSoon: number;
  rejected: number;
}

export function DocumentsSummaryPanel({
  totalRequired,
  uploaded,
  missing,
  expiringSoon,
  rejected,
}: DocumentsSummaryPanelProps) {
  const stats = [
    {
      label: "Total Required Docs",
      value: totalRequired,
      icon: FileText,
      color: "text-foreground",
    },
    {
      label: "Uploaded",
      value: uploaded,
      icon: Upload,
      color: "text-green-600",
    },
    {
      label: "Missing",
      value: missing,
      icon: AlertCircle,
      color: "text-red-600",
    },
    {
      label: "Expiring Soon",
      value: expiringSoon,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      label: "Rejected",
      value: rejected,
      icon: XCircle,
      color: "text-red-600",
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Documents Summary</h3>
      <div className="space-y-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isFirst = index === 0;
          const bgColor = isFirst ? 'bg-muted/50' : 'bg-transparent';
          
          return (
            <div key={stat.label}>
              <div className={`flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/30 ${bgColor}`}>
                <div className="flex items-center gap-3">
                  <div className={`rounded-md p-2 ${isFirst ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <span className="text-sm font-medium">{stat.label}</span>
                </div>
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
              </div>
              {index < stats.length - 1 && (
                <div className="my-2 border-t border-border/50" />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
