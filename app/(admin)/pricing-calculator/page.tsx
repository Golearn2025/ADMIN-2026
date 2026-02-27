import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Calculator } from "lucide-react";

export default function PricingCalculatorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Calculator"
        subtitle="Calculate pricing and estimates for your services"
      />
      <EmptyState
        icon={Calculator}
        title="Pricing Calculator"
        description="Calculate service pricing, estimates, and profit margins. This feature will be available soon."
      />
    </div>
  );
}
