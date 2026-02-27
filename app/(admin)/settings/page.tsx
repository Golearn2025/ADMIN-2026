import { Settings } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure application preferences and account settings"
      />
      <EmptyState
        icon={Settings}
        title="Settings Coming Soon"
        description="Application settings and preferences will be available here."
      />
    </div>
  );
}
