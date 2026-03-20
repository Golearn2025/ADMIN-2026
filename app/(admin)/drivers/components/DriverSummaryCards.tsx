"use client";

import { FileText, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import type { Driver } from "@/lib/features/drivers/drivers.types";

interface DriverSummaryCardsProps {
  driver: Driver;
}

export function DriverSummaryCards({ driver }: DriverSummaryCardsProps) {
  const cards = [
    {
      title: "Documents Required",
      value: driver.documents_required,
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Documents Completed",
      value: driver.documents_completed,
      icon: FileText,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Documents Expired",
      value: driver.documents_expired,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Vehicles",
      value: driver.total_vehicles,
      icon: Clock,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
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
