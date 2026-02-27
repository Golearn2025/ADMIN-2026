import { FileText } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function DocumentsPage() {
  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Manage driver and vehicle documents"
        actions={
          <Button size="sm">Upload Document</Button>
        }
      />
      <EmptyState
        icon={FileText}
        title="No Documents"
        description="Driver licenses, insurance, and other documents will appear here."
      />
    </div>
  );
}
