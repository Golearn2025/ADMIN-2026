import { Users } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function TeamPage() {
  return (
    <div>
      <PageHeader
        title="Team & Roles"
        subtitle="Manage team members and permissions"
        actions={
          <Button size="sm">Invite Member</Button>
        }
      />
      <EmptyState
        icon={Users}
        title="No Team Members"
        description="Team member profiles and role assignments will appear here."
      />
    </div>
  );
}
