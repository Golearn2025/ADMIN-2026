"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Car, Shield, Activity, User } from "lucide-react";
import { useDriverDetails } from "@/lib/features/drivers/hooks/useDriverDetails";
import { DriverDocumentsTab } from "@/app/(admin)/drivers/components/tabs/DriverDocumentsTab";
import { DriverOverviewTab } from "./tabs/DriverOverviewTab";
import { DriverActivityTab } from "./tabs/DriverActivityTab";
import { DriverDetailHeader } from "./DriverDetailHeader";
import { PremiumKPICards } from "./PremiumKPICards";
import { CompactDocumentsSummary } from "./CompactDocumentsSummary";

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

  const handleDriverAction = (action: string) => {
    console.log(`Driver action: ${action}`, selectedDriverId);
    // TODO: Implement driver actions via API
    alert(`Action "${action}" will be implemented`);
  };

  // Calculate document stats for summary panel
  const totalRequired = 6; // From business rules
  const uploaded = driverDocuments.filter(d => d.status === 'approved').length;
  const missing = driver?.missing_driver_docs || 0;
  const expiringSoon = driverDocuments.filter(d => {
    if (!d.expiry_date) return false;
    const expiryDate = new Date(d.expiry_date);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }).length;
  const rejected = driverDocuments.filter(d => d.status === 'rejected').length;

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
        <DriverDetailHeader driver={driver} />

      {/* KPI Cards - Max 4 */}
      <PremiumKPICards
        rating={driver.rating_average || 0}
        ratingCount={driver.rating_count || 0}
        totalTrips={0}
        totalEarnings={0}
        documentsCompleted={uploaded}
        documentsTotal={totalRequired}
      />

      {/* Compact Documents Summary */}
      <CompactDocumentsSummary
        uploaded={uploaded}
        expiring={expiringSoon}
        missing={missing}
      />

      {/* Tabs Section - Sticky */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-8 px-8 py-4 border-b border-border">
        <Tabs defaultValue="overview" className="space-y-6" onValueChange={(value) => {
          console.log("CLICK TAB:", value);
          console.log("ACTIVE TAB:", value);
        }}>
          <TabsList className="h-12">
            <TabsTrigger value="overview" className="data-[state=active]:font-bold">Overview</TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:font-bold">Details</TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:font-bold">Documents</TabsTrigger>
            <TabsTrigger value="vehicles" className="data-[state=active]:font-bold">Vehicles</TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:font-bold">Compliance</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:font-bold">Activity Log</TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:font-bold">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DriverOverviewTab driver={driver} />
          </TabsContent>

          <TabsContent value="details">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Driver Details</h3>
              <p className="text-sm text-muted-foreground">Detailed information coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <DriverDocumentsTab 
              driverId={driver.id}
              driverDocuments={driverDocuments}
              vehicleDocuments={vehicleDocuments}
              onRefresh={refetch}
            />
          </TabsContent>

        <TabsContent value="vehicles">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Vehicles</h3>
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vehicles found</p>
            ) : (
              <div className="space-y-4">
                {vehicles.map((vehicle: any) => (
                  <div key={vehicle.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {vehicle.model_name || vehicle.make || "Unknown Vehicle"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Year: {vehicle.year} • Plate: {vehicle.plate || "N/A"} • Color: {vehicle.color || "N/A"}
                        </p>
                        {vehicle.category && (
                          <p className="text-xs text-muted-foreground capitalize">
                            Category: {vehicle.category}
                          </p>
                        )}
                      </div>
                      <span className="text-sm capitalize">{vehicle.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="compliance">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Compliance Status</h3>
            <p className="text-sm text-muted-foreground">Compliance tracking coming soon</p>
          </div>
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
    </div>
  );
}
