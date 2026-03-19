"use client";

import { FileText, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import type { Driver } from "@/lib/features/drivers/drivers.types";

interface DriverSummaryCardsProps {
  driver: Driver;
}

export function DriverSummaryCards({ driver }: DriverSummaryCardsProps) {
  const cards = [
    {
      title: "Driver Documents",
      value: driver.total_driver_docs,
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Vehicle Documents",
      value: driver.total_vehicle_docs,
      icon: FileText,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Missing Documents",
      value: driver.missing_driver_docs + driver.missing_vehicle_docs,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Expiring Soon",
      value: driver.expired_driver_docs + driver.expired_vehicle_docs,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="rounded-lg border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>
                <p className="mt-2 text-3xl font-bold">{card.value}</p>
              </div>
              <div className={`rounded-full p-3 ${card.bgColor}`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
