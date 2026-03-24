"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Car, Shield, Activity, User } from "lucide-react";
import { useDriverDetails } from "@/lib/features/drivers/hooks/useDriverDetails";
import { DriverDocumentsTab } from "@/app/(admin)/drivers/components/tabs/DriverDocumentsTab";
import { DriverDetailsTab } from "./tabs/DriverDetailsTab";
import { DriverVehiclesTab } from "./tabs/DriverVehiclesTab";
import { DriverActivityTab } from "./tabs/DriverActivityTab";
import { DriverDetailHeader } from "./DriverDetailHeader";
import { CompactDocumentsSummary } from "./CompactDocumentsSummary";
import { DriverActionDialog } from "./DriverActionDialog";
import { useToast } from "@/hooks/use-toast";

interface DriverWorkspaceProps {
  selectedDriverId: string | null;
  onRefresh: () => void;
}

export function DriverWorkspace({
  selectedDriverId,
  onRefresh,
}: DriverWorkspaceProps) {
  const { driver, driverDocuments, vehicles, vehicleDocuments, isLoading, refetch } = 
    useDriverDetails(selectedDriverId);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"suspend" | "deactivate">("suspend");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // DEBUG: Hook data
  console.log("=== DRIVER WORKSPACE HOOK DATA ===");
  console.log("DRIVER FULL:", driver);
  console.log("DOCUMENTS:", driver?.driver_documents);
  console.log("VEHICLES:", driver?.vehicles);
  console.log("---");
  console.log("driverDocuments from hook:", driverDocuments);
  console.log("driverDocuments is ARRAY?", Array.isArray(driverDocuments));
  console.log("driverDocuments length:", driverDocuments?.length || 0);
  console.log("---");
  console.log("vehicles from hook:", vehicles);
  console.log("vehicles is ARRAY?", Array.isArray(vehicles));
  console.log("vehicles length:", vehicles?.length || 0);
  console.log("---");
  console.log("vehicleDocuments from hook:", vehicleDocuments);
  console.log("vehicleDocuments is ARRAY?", Array.isArray(vehicleDocuments));
  console.log("vehicleDocuments length:", vehicleDocuments?.length || 0);
  console.log("==================================");

  // NO calculations - use data from admin_driver_overview_v2 view
  // All stats come from the driver object directly

  const handleApprove = async () => {
    if (!driver) return;

    if (driver.compliance_status !== "ok") {
      toast({
        title: "Cannot Approve Driver",
        description: `Driver compliance status is '${driver.compliance_status}'. Only drivers with 'ok' compliance can be approved.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/drivers/${driver.id}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve driver");
      }

      toast({
        title: "Driver Approved",
        description: "Driver has been successfully approved.",
      });
      refetch();
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve driver",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspend = () => {
    if (!driver) return;
    setDialogAction("suspend");
    setDialogOpen(true);
  };

  const handleDeactivate = () => {
    if (!driver) return;
    setDialogAction("deactivate");
    setDialogOpen(true);
  };

  const handleConfirmAction = async (reason: string) => {
    if (!driver) return;

    setIsProcessing(true);
    try {
      const endpoint = dialogAction === "suspend" ? "suspend" : "deactivate";
      const response = await fetch(`/api/admin/drivers/${driver.id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${dialogAction} driver`);
      }

      toast({
        title: `Driver ${dialogAction === "suspend" ? "Suspended" : "Deactivated"}`,
        description: `Driver has been successfully ${dialogAction === "suspend" ? "suspended" : "deactivated"}.`,
      });
      setDialogOpen(false);
      refetch();
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${dialogAction} driver`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedDriverId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select a driver to view details
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        Loading driver details...
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        Driver not found
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-8 p-8">
        {/* Hero Section */}
        <DriverDetailHeader driver={driver} onRefresh={refetch} />

      {/* Documents Summary */}
      <CompactDocumentsSummary
        approved={driver.documents_completed ?? 0}
        expired={driver.documents_expired ?? 0}
        missing={(driver.documents_required ?? 0) - (driver.documents_completed ?? 0)}
      />

      {/* Tabs Section - Sticky */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-8 px-8 py-4 border-b border-border">
        <Tabs defaultValue="details" className="space-y-6" onValueChange={(value) => {
          console.log("CLICK TAB:", value);
          console.log("ACTIVE TAB:", value);
        }}>
          <TabsList className="h-12">
            <TabsTrigger value="details" className="data-[state=active]:font-bold">Details</TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:font-bold">Documents</TabsTrigger>
            <TabsTrigger value="vehicles" className="data-[state=active]:font-bold">Vehicles</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:font-bold">Activity Log</TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:font-bold">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <DriverDetailsTab driver={driver} />
          </TabsContent>

          <TabsContent value="documents">
            <DriverDocumentsTab 
              driverId={driver.id}
              profilePhotoUrl={driver.profile_photo_url}
              profilePhotoStatus={driver.profile_photo_status || "pending"}
              profilePhotoReviewedBy={driver.profile_photo_reviewed_by}
              profilePhotoReviewedAt={driver.profile_photo_reviewed_at}
              profilePhotoRejectionReason={driver.profile_photo_rejection_reason}
              driverDocuments={driverDocuments}
              vehicleDocuments={vehicleDocuments}
              onRefresh={refetch}
            />
          </TabsContent>

        <TabsContent value="vehicles">
          <DriverVehiclesTab vehicles={vehicles} />
        </TabsContent>

        
        <TabsContent value="activity">
          <DriverActivityTab driverId={driver.id} organizationId={driver.organization_id} />
        </TabsContent>

        <TabsContent value="notes">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Notes</h3>
            <p className="text-sm text-muted-foreground">Notes functionality coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
      </div>
      </div>

      <DriverActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
        driverName={driver.full_name || "Driver"}
        onConfirm={handleConfirmAction}
        isProcessing={isProcessing}
      />
    </div>
  );
}
