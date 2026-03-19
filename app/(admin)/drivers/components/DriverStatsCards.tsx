"use client";

import { Card } from "@/components/ui/card";
import { FileText, Car } from "lucide-react";

interface DriverStatsCardsProps {
  driverDocsCount: number;
  vehicleDocsCount: number;
  totalVehicles: number;
}

export function DriverStatsCards({ driverDocsCount, vehicleDocsCount, totalVehicles }: DriverStatsCardsProps) {
  const stats = [
    {
      label: "Total Vehicles",
      value: totalVehicles,
      icon: Car,
      color: "text-purple-600",
    },
    {
      label: "Driver Documents",
      value: driverDocsCount,
      icon: FileText,
      color: "text-blue-600",
    },
    {
      label: "Vehicle Documents",
      value: vehicleDocsCount,
      icon: FileText,
      color: "text-green-600",
    },
  ];

  return (
    <div className="flex gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-4 flex-1">
            <div className="flex flex-col items-center justify-center text-center gap-2">
              <div className={`rounded-lg p-2.5 ${stat.color} bg-muted`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
