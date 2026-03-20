"use client";

import { Eye, Download, Upload } from "lucide-react";
import { DocumentActionButton } from "./DocumentActionButton";

interface DocumentPrimaryActionsProps {
  documentId: string;
  onView: (documentId: string) => void;
  onDownload: (documentId: string) => void;
  onReplace: (documentId: string) => void;
  disabled?: boolean;
}

/**
 * DocumentPrimaryActions
 * 
 * Primary document actions displayed as icon buttons.
 * - View: Opens document in viewer
 * - Download: Downloads document file
 * - Replace: Uploads new file to replace existing document
 */
export function DocumentPrimaryActions({
  documentId,
  onView,
  onDownload,
  onReplace,
  disabled = false,
}: DocumentPrimaryActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <DocumentActionButton
        icon={Eye}
        label="View document"
        onClick={() => onView(documentId)}
        disabled={disabled}
      />
      <DocumentActionButton
        icon={Download}
        label="Download document"
        onClick={() => onDownload(documentId)}
        disabled={disabled}
      />
      <DocumentActionButton
        icon={Upload}
        label="Replace document"
        onClick={() => onReplace(documentId)}
        disabled={disabled}
      />
    </div>
  );
}
