"use client";

import { Card } from "@/components/ui/card";
import { TrendingUp, Star, Calendar, DollarSign } from "lucide-react";

interface DriverPerformanceCardProps {
  rating: number;
  ratingCount: number;
  totalTrips?: number;
  totalEarnings?: number;
  memberSince?: string;
}

export function DriverPerformanceCard({
  rating,
  ratingCount,
  totalTrips = 0,
  totalEarnings = 0,
  memberSince,
}: DriverPerformanceCardProps) {
  const stats = [
    {
      label: "Rating",
      value: rating > 0 ? rating.toFixed(1) : "N/A",
      subtext: `${ratingCount} reviews`,
      icon: Star,
      color: "text-yellow-600",
    },
    {
      label: "Total Trips",
      value: totalTrips,
      subtext: "completed",
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      label: "Earnings",
      value: totalEarnings > 0 ? `£${totalEarnings.toLocaleString()}` : "£0",
      subtext: "total",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      label: "Member Since",
      value: memberSince ? new Date(memberSince).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : "N/A",
      subtext: "",
      icon: Calendar,
      color: "text-purple-600",
    },
  ];

  return (
    <Card className="p-4 flex flex-col h-full">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Performance</h3>
      <div className="grid grid-cols-2 gap-4 flex-1 content-center">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex flex-col items-center justify-center text-center p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className={`rounded-lg p-2.5 ${stat.color} bg-background mb-2`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
              {stat.subtext && (
                <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
