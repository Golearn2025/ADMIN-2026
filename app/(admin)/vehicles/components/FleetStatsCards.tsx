"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Briefcase, Truck, Users } from "lucide-react";

interface CategoryStats {
  luxury: number;
  executive: number;
  suv: number;
  mpv: number;
}

interface ModelStats {
  "bmw-7-series": number;
  "mercedes-s-class": number;
  "mercedes-e-class": number;
  "bmw-5-series": number;
  "range-rover": number;
  "mercedes-v-class": number;
}

interface YearStats {
  [key: number]: number;
}

interface FleetStatsCardsProps {
  categoryStats: CategoryStats;
  modelStats: ModelStats;
  yearStats: YearStats;
}

const MODEL_LABELS: { [key: string]: string } = {
  "bmw-7-series": "BMW 7 Series",
  "mercedes-s-class": "Mercedes S Class",
  "mercedes-e-class": "Mercedes E Class",
  "bmw-5-series": "BMW 5 Series",
  "range-rover": "Range Rover",
  "mercedes-v-class": "Mercedes V Class"
};

const CATEGORY_LABELS: { [key: string]: string } = {
  luxury: "Luxury",
  executive: "Executive",
  suv: "SUV",
  mpv: "MPV"
};

const getCategoryIcon = (category: string) => {
  const icons: { [key: string]: any } = {
    luxury: Car,
    executive: Briefcase,
    suv: Truck,
    mpv: Users
  };
  return icons[category] || Car;
};

export function FleetStatsCards({ 
  categoryStats, 
  modelStats, 
  yearStats 
}: FleetStatsCardsProps) {

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Category Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(categoryStats).map(([category, count]) => {
          const Icon = getCategoryIcon(category);
          return (
            <Card key={category}>
              <CardContent className="p-4 md:p-6">
                <div className="text-center space-y-1 md:space-y-2">
                  <div className="flex justify-center">
                    <Icon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">
                      {CATEGORY_LABELS[category]}
                    </p>
                    <p className="text-2xl md:text-3xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">vehicles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Model Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Fleet by Model</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Executive Models - Column 1 & 2 */}
            {modelStats["mercedes-e-class"] !== undefined && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Mercedes E Class</span>
                <span className="text-lg font-bold">{modelStats["mercedes-e-class"]}</span>
              </div>
            )}
            {modelStats["bmw-5-series"] !== undefined && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">BMW 5 Series</span>
                <span className="text-lg font-bold">{modelStats["bmw-5-series"]}</span>
              </div>
            )}
            {/* Luxury Models - Column 1 & 2 */}
            {modelStats["bmw-7-series"] !== undefined && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">BMW 7 Series</span>
                <span className="text-lg font-bold">{modelStats["bmw-7-series"]}</span>
              </div>
            )}
            {modelStats["mercedes-s-class"] !== undefined && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Mercedes S Class</span>
                <span className="text-lg font-bold">{modelStats["mercedes-s-class"]}</span>
              </div>
            )}
            {/* SUV Models - Column 1 */}
            {modelStats["range-rover"] !== undefined && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Range Rover</span>
                <span className="text-lg font-bold">{modelStats["range-rover"]}</span>
              </div>
            )}
            {/* MPV Models - Column 2 */}
            {modelStats["mercedes-v-class"] !== undefined && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Mercedes V Class</span>
                <span className="text-lg font-bold">{modelStats["mercedes-v-class"]}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Year Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Fleet by Year</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(yearStats)
              .sort(([a], [b]) => parseInt(b) - parseInt(a))
              .map(([year, count]) => (
                <div key={year} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">{year}</span>
                  <span className="text-lg font-bold">{count}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
