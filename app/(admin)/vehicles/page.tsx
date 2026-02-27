import { Car } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function VehiclesPage() {
  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle="Manage fleet vehicles and maintenance"
        actions={
          <>
            <Button variant="outline" size="sm">
              Export
            </Button>
            <Button size="sm">Add Vehicle</Button>
          </>
        }
      />
      <EmptyState
        icon={Car}
        title="No Vehicles"
        description="Vehicle information and fleet data will appear here."
      />
    </div>
  );
}
