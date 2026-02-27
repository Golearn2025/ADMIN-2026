import { Briefcase } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function JobsPage() {
  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle="Track and manage job assignments"
        actions={
          <Button size="sm">Create Job</Button>
        }
      />
      <EmptyState
        icon={Briefcase}
        title="No Jobs Available"
        description="Job tracking will appear here once data is connected."
      />
    </div>
  );
}
