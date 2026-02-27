import { TrendingUp } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function FinancialsPage() {
  return (
    <div>
      <PageHeader
        title="Financial Overview"
        subtitle="Revenue, expenses, and financial analytics"
        actions={
          <Button variant="outline" size="sm">
            Download Report
          </Button>
        }
      />
      <EmptyState
        icon={TrendingUp}
        title="Financial Data Coming Soon"
        description="Financial metrics and analytics will be displayed here."
      />
    </div>
  );
}
