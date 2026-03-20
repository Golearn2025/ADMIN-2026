"use client";

import { DocumentPrimaryActions } from "./DocumentPrimaryActions";
import { DocumentSettingsMenu } from "./DocumentSettingsMenu";

interface DocumentActionsProps {
  documentId: string;
  onView: (documentId: string) => void;
  onDownload: (documentId: string) => void;
  onReplace: (documentId: string) => void;
  onViewHistory: (documentId: string) => void;
  onEditExpiry: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
  disabled?: boolean;
  showDelete?: boolean;
}

/**
 * DocumentActions
 * 
 * Container component for all document actions.
 * Combines primary actions (View, Download, Replace) with settings menu.
 * 
 * All handlers are passed as props - NO business logic here.
 * This is a pure presentational component.
 */
export function DocumentActions({
  documentId,
  onView,
  onDownload,
  onReplace,
  onViewHistory,
  onEditExpiry,
  onDelete,
  disabled = false,
  showDelete = false,
}: DocumentActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <DocumentPrimaryActions
        documentId={documentId}
        onView={onView}
        onDownload={onDownload}
        onReplace={onReplace}
        disabled={disabled}
      />
      <DocumentSettingsMenu
        documentId={documentId}
        onViewHistory={onViewHistory}
        onEditExpiry={onEditExpiry}
        onDelete={onDelete}
        disabled={disabled}
        showDelete={showDelete}
      />
    </div>
  );
}
