import { Building2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function OrganizationsPage() {
  return (
    <div>
      <PageHeader
        title="Organizations"
        subtitle="Manage organization settings and structure"
        actions={
          <Button size="sm">Add Organization</Button>
        }
      />
      <EmptyState
        icon={Building2}
        title="No Organizations"
        description="Organization profiles and settings will appear here."
      />
    </div>
  );
}
