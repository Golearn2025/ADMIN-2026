"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, History, Calendar, Trash2 } from "lucide-react";

interface DocumentSettingsMenuProps {
  documentId: string;
  onViewHistory: (documentId: string) => void;
  onEditExpiry: (documentId: string) => void;
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
  onViewHistory,
  onEditExpiry,
  onDelete,
  disabled = false,
  showDelete = false,
}: DocumentSettingsMenuProps) {
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
