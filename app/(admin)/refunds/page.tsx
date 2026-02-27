import { RotateCcw } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function RefundsPage() {
  return (
    <div>
      <PageHeader
        title="Refunds"
        subtitle="Manage refund requests and processing"
        actions={
          <Button variant="outline" size="sm">
            Export
          </Button>
        }
      />
      <EmptyState
        icon={RotateCcw}
        title="No Refunds"
        description="Refund requests and history will be displayed here."
      />
    </div>
  );
}
