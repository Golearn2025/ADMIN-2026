"use client";

import { Button } from "@/components/ui/button";
import { Upload, Eye, Settings } from "lucide-react";

interface DocumentActionsMenuProps {
  documentId: string;
  onReplace: () => void;
  onView: () => void;
  onManage: () => void;
}

export function DocumentActionsMenu({
  documentId,
  onReplace,
  onView,
  onManage,
}: DocumentActionsMenuProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={onReplace}
        title="Replace file"
      >
        <Upload className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onView}
        title="View file"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onManage}
        title="Manage"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}
