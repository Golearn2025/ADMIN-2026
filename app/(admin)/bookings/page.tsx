import { Calendar } from "lucide-react";
import { PageHeader } from "@/components/common";
import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function BookingsPage() {
  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="Manage all ride bookings and reservations"
        actions={
          <>
            <Button variant="outline" size="sm">
              Export
            </Button>
            <Button size="sm">New Booking</Button>
          </>
        }
      />
      <EmptyState
        icon={Calendar}
        title="No Bookings Yet"
        description="Bookings data will appear here once connected to the database."
        action={
          <Button variant="outline">Connect Database</Button>
        }
      />
    </div>
  );
}
