import { UserCircle } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function DriversPage() {
  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Manage driver profiles and availability"
        actions={
          <>
            <Button variant="outline" size="sm">
              Export
            </Button>
            <Button size="sm">Add Driver</Button>
          </>
        }
      />
      <EmptyState
        icon={UserCircle}
        title="No Drivers"
        description="Driver profiles and information will appear here."
      />
    </div>
  );
}
