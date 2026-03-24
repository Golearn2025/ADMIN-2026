"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

interface DocumentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expiringSoon: number;
}

interface DocumentStatsCardsProps {
  stats: DocumentStats;
}

export function DocumentStatsCards({ stats }: DocumentStatsCardsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {/* Total Documents */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="text-center space-y-1 md:space-y-2">
            <div className="flex justify-center">
              <FileText className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                Total
              </p>
              <p className="text-2xl md:text-3xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">documents</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="text-center space-y-1 md:space-y-2">
            <div className="flex justify-center">
              <Clock className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                Pending
              </p>
              <p className="text-2xl md:text-3xl font-bold text-orange-500">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">to review</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approved */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="text-center space-y-1 md:space-y-2">
            <div className="flex justify-center">
              <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                Approved
              </p>
              <p className="text-2xl md:text-3xl font-bold text-green-500">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">verified</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rejected */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="text-center space-y-1 md:space-y-2">
            <div className="flex justify-center">
              <XCircle className="h-6 w-6 md:h-8 md:w-8 text-red-500" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                Rejected
              </p>
              <p className="text-2xl md:text-3xl font-bold text-red-500">{stats.rejected}</p>
              <p className="text-xs text-muted-foreground">declined</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expiring Soon */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="text-center space-y-1 md:space-y-2">
            <div className="flex justify-center">
              <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                Expiring Soon
              </p>
              <p className="text-2xl md:text-3xl font-bold text-yellow-500">{stats.expiringSoon}</p>
              <p className="text-xs text-muted-foreground">within 30 days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
