import { DollarSign } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function PaymentsPage() {
  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Track and manage all payment transactions"
        actions={
          <>
            <Button variant="outline" size="sm">
              Export
            </Button>
            <Button size="sm">New Payment</Button>
          </>
        }
      />
      <EmptyState
        icon={DollarSign}
        title="No Payments"
        description="Payment history and transactions will appear here."
      />
    </div>
  );
}
