"use client";

import { FileText, CheckCircle2, AlertTriangle, Clock, XCircle } from "lucide-react";
import type { Driver } from "@/lib/features/drivers/drivers.types";

interface DriverDocumentsSummaryPanelProps {
  driver: Driver;
}

export function DriverDocumentsSummaryPanel({ driver }: DriverDocumentsSummaryPanelProps) {
  const totalRequired = driver.total_driver_docs + driver.total_vehicle_docs;
  const totalMissing = driver.missing_driver_docs + driver.missing_vehicle_docs;
  const totalExpired = driver.expired_driver_docs + driver.expired_vehicle_docs;
  const totalPending = driver.pending_driver_docs + driver.pending_vehicle_docs;
  const uploaded = totalRequired - totalMissing;

  const items = [
    {
      label: "Total Required",
      value: totalRequired,
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Uploaded",
      value: uploaded,
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
      label: "Expiring Soon",
      value: totalExpired,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Pending Review",
      value: totalPending,
      icon: XCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
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
