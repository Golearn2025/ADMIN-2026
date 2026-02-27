import { CreditCard } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function BillingPage() {
  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Customer invoices and billing information"
        actions={
          <Button size="sm">Create Invoice</Button>
        }
      />
      <EmptyState
        icon={CreditCard}
        title="No Billing Records"
        description="Customer billing and invoice data will appear here."
      />
    </div>
  );
}
