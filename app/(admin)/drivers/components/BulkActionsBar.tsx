"use client";

import { Button } from "@/components/ui/button";
import { Check, X, Trash2 } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
  isProcessing?: boolean;
  isRejectPanelOpen?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onApprove,
  onReject,
  onClear,
  isProcessing = false,
  isRejectPanelOpen = false,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Check className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">
          {selectedCount} document{selectedCount !== 1 ? "s" : ""} selected
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          type="button"
          onClick={onApprove}
          disabled={isProcessing}
        >
          <Check className="h-4 w-4 mr-1" />
          Approve
        </Button>
        
        <Button
          size="sm"
          variant={isRejectPanelOpen ? "outline" : "destructive"}
          type="button"
          onClick={onReject}
          disabled={isProcessing}
        >
          <X className="h-4 w-4 mr-1" />
          Reject
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={onClear}
          disabled={isProcessing}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}
