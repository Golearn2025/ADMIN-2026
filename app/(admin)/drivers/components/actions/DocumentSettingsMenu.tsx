"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, History, Calendar, Trash2, Check, X } from "lucide-react";

interface DocumentSettingsMenuProps {
  documentId: string;
  documentStatus?: string;
  onViewHistory: (documentId: string) => void;
  onEditExpiry: (documentId: string) => void;
  onApprove?: (documentId: string) => void;
  onReject?: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
  disabled?: boolean;
  showDelete?: boolean;
}

/**
 * DocumentSettingsMenu
 * 
 * Secondary document actions in a dropdown menu.
 * - View History: Shows document status change history
 * - Edit Expiry Date: Updates document expiration date
 * - Delete Document: Removes document (optional, destructive)
 */
export function DocumentSettingsMenu({
  documentId,
  documentStatus,
  onViewHistory,
  onEditExpiry,
  onApprove,
  onReject,
  onDelete,
  disabled = false,
  showDelete = false,
}: DocumentSettingsMenuProps) {
  const isPending = documentStatus === "pending";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled}
          title="More actions"
          aria-label="More actions"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isPending && onApprove && onReject && (
          <>
            <DropdownMenuItem 
              onClick={() => onApprove(documentId)}
              className="text-green-600 focus:text-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve Document
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onReject(documentId)}
              className="text-red-600 focus:text-red-700"
            >
              <X className="h-4 w-4 mr-2" />
              Reject Document
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => onViewHistory(documentId)}>
          <History className="h-4 w-4 mr-2" />
          View History
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEditExpiry(documentId)}>
          <Calendar className="h-4 w-4 mr-2" />
          Edit Expiry Date
        </DropdownMenuItem>
        {showDelete && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(documentId)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Document
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
