"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, Car, Shield, Activity, User } from "lucide-react";
import type { Driver } from "@/lib/features/drivers/drivers.types";
import { DriverDocumentsTab } from "./tabs/DriverDocumentsTab";
import { DriverOverviewTab } from "./tabs/DriverOverviewTab";
import { DriverActivityTab } from "./tabs/DriverActivityTab";

interface DriverWorkspaceProps {
  selectedDriver: Driver | null;
  onRefresh: () => void;
}

export function DriverWorkspace({
  selectedDriver,
  onRefresh,
}: DriverWorkspaceProps) {
  if (!selectedDriver) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <User className="mx-auto h-16 w-16 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No driver selected</p>
          <p className="text-sm text-muted-foreground">
            Select a driver from the sidebar to view details
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ok":
        return "default";
      case "pending":
        return "secondary";
      default:
        return "destructive";
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {selectedDriver.first_name} {selectedDriver.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedDriver.email || selectedDriver.phone}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(selectedDriver.compliance_status)}>
                {selectedDriver.compliance_status}
              </Badge>
              <Badge variant="outline">
                {selectedDriver.onboarding_status}
              </Badge>
              {selectedDriver.is_approved && (
                <Badge variant="default">Approved</Badge>
              )}
              {selectedDriver.can_receive_jobs && (
                <Badge variant="default">Can Receive Jobs</Badge>
              )}
            </div>
          </div>
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <User className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="gap-2">
              <Car className="h-4 w-4" />
              Vehicles
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-2">
              <Shield className="h-4 w-4" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DriverOverviewTab driver={selectedDriver} />
          </TabsContent>

          <TabsContent value="documents">
            <DriverDocumentsTab driverId={selectedDriver.id} />
          </TabsContent>

          <TabsContent value="vehicles">
            <div className="text-center text-muted-foreground">
              Vehicles tab - Coming soon
            </div>
          </TabsContent>

          <TabsContent value="compliance">
            <div className="text-center text-muted-foreground">
              Compliance tab - Coming soon
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <DriverActivityTab driverId={selectedDriver.id} organizationId={selectedDriver.organization_id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
