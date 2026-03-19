"use client";

import { Star, Car, PoundSterling, FileCheck } from "lucide-react";

interface PremiumKPICardsProps {
  rating: number;
  ratingCount: number;
  totalTrips: number;
  totalEarnings: number;
  documentsCompleted: number;
  documentsTotal: number;
}

export function PremiumKPICards({
  rating,
  ratingCount,
  totalTrips,
  totalEarnings,
  documentsCompleted,
  documentsTotal,
}: PremiumKPICardsProps) {
  const kpis = [
    {
      icon: Star,
      value: rating.toFixed(1),
      label: "Rating",
      subtitle: `${ratingCount} reviews`,
      color: "text-gray-400",
      bgColor: "bg-white/5",
    },
    {
      icon: Car,
      value: totalTrips.toString(),
      label: "Trips",
      subtitle: "completed",
      color: "text-gray-400",
      bgColor: "bg-white/5",
    },
    {
      icon: PoundSterling,
      value: `£${(totalEarnings / 1000).toFixed(1)}K`,
      label: "Earnings",
      subtitle: "total",
      color: "text-gray-400",
      bgColor: "bg-white/5",
    },
    {
      icon: FileCheck,
      value: `${documentsCompleted}/${documentsTotal}`,
      label: "Documents",
      subtitle: "complete",
      color: "text-gray-400",
      bgColor: "bg-white/5",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className="rounded-xl border border-white/5 bg-[#0B0F14] p-6 shadow-lg hover:border-white/10 transition-all"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className={`rounded-lg p-3 ${kpi.bgColor}`}>
                <Icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{kpi.value}</p>
                <p className="text-sm font-medium text-gray-400 mt-1">{kpi.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{kpi.subtitle}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
