"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX, Calendar } from "lucide-react";

interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
}

interface CustomerStatsCardsProps {
  stats: CustomerStats;
}

export function CustomerStatsCards({ stats }: CustomerStatsCardsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Customers */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="text-center space-y-1 md:space-y-2">
            <div className="flex justify-center">
              <Users className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                Total Customers
              </p>
              <p className="text-2xl md:text-3xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">registered</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="text-center space-y-1 md:space-y-2">
            <div className="flex justify-center">
              <UserCheck className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                Active
              </p>
              <p className="text-2xl md:text-3xl font-bold text-green-500">{stats.active}</p>
              <p className="text-xs text-muted-foreground">customers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inactive */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="text-center space-y-1 md:space-y-2">
            <div className="flex justify-center">
              <UserX className="h-6 w-6 md:h-8 md:w-8 text-red-500" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                Inactive
              </p>
              <p className="text-2xl md:text-3xl font-bold text-red-500">{stats.inactive}</p>
              <p className="text-xs text-muted-foreground">customers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New This Month */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="text-center space-y-1 md:space-y-2">
            <div className="flex justify-center">
              <Calendar className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                New This Month
              </p>
              <p className="text-2xl md:text-3xl font-bold text-blue-500">{stats.newThisMonth}</p>
              <p className="text-xs text-muted-foreground">joined</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
