import { Map } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common";

export default function LiveMapPage() {
  return (
    <div>
      <PageHeader
        title="Live Map"
        subtitle="Real-time driver locations and active rides"
      />
      <EmptyState
        icon={Map}
        title="Live Map Coming Soon"
        description="Real-time tracking and driver locations will be displayed here."
      />
    </div>
  );
}
