import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="View and manage your notifications"
      />
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="You're all caught up! No new notifications at this time."
      />
    </div>
  );
}
