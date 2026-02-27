import { EmptyState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your business metrics and activity"
        actions={
          <Button variant="outline" size="sm">
            Refresh Data
          </Button>
        }
      />
      <EmptyState
        icon={LayoutDashboard}
        title="Dashboard Coming Soon"
        description="Analytics, metrics, and insights will be displayed here once data is connected."
      />
    </div>
  );
}
