import { Users } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function CustomersPage() {
  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Manage customer accounts and profiles"
        actions={
          <>
            <Button variant="outline" size="sm">
              Export
            </Button>
            <Button size="sm">Add Customer</Button>
          </>
        }
      />
      <EmptyState
        icon={Users}
        title="No Customers"
        description="Customer profiles and booking history will appear here."
      />
    </div>
  );
}
