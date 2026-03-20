"use client";

import { FileText, CheckCircle2, AlertTriangle, Clock, XCircle } from "lucide-react";
import type { Driver } from "@/lib/features/drivers/drivers.types";

interface DriverDocumentsSummaryPanelProps {
  driver: Driver;
}

export function DriverDocumentsSummaryPanel({ driver }: DriverDocumentsSummaryPanelProps) {
  const totalRequired = driver.documents_required;
  const totalCompleted = driver.documents_completed;
  const totalExpired = driver.documents_expired;
  const totalMissing = totalRequired - totalCompleted;

  const items = [
    {
      label: "Total Required",
      value: totalRequired,
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Completed",
      value: totalCompleted,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Missing",
      value: totalMissing,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Expired",
      value: totalExpired,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold">Documents Summary</h3>
      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${item.bgColor}`}>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <span className="text-lg font-bold">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
