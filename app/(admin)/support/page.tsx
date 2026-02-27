import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Headphones } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        subtitle="Get help and contact our support team"
      />
      <EmptyState
        icon={Headphones}
        title="Support Center"
        description="Contact support or browse help documentation. This feature will be available soon."
      />
    </div>
  );
}
