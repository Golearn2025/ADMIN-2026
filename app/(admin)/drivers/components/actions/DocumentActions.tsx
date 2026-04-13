"use client";

import { DocumentPrimaryActions } from "./DocumentPrimaryActions";
import { DocumentSettingsMenu } from "./DocumentSettingsMenu";

interface DocumentActionsProps {
  documentId: string;
  documentStatus?: string;
  onView: (documentId: string) => void;
  onDownload: (documentId: string) => void;
  onReplace: (documentId: string) => void;
  onViewHistory: (documentId: string) => void;
  onEditExpiry: (documentId: string) => void;
  onApprove?: (documentId: string) => void;
  onReject?: (documentId: string) => void;
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
  documentStatus,
  onView,
  onDownload,
  onReplace,
  onViewHistory,
  onEditExpiry,
  onApprove,
  onReject,
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
        documentStatus={documentStatus}
        onViewHistory={onViewHistory}
        onEditExpiry={onEditExpiry}
        onApprove={onApprove}
        onReject={onReject}
        onDelete={onDelete}
        disabled={disabled}
        showDelete={showDelete}
      />
    </div>
  );
}
