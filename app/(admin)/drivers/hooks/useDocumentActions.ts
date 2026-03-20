"use client";

/**
 * useDocumentActions
 * 
 * Lightweight hook for document action handlers.
 * NO heavy business logic - just passes through callbacks.
 * All actual logic should be in parent components or service layer.
 */

interface UseDocumentActionsProps {
  onView?: (documentId: string) => void;
  onDownload?: (documentId: string) => void;
  onReplace?: (documentId: string) => void;
  onViewHistory?: (documentId: string) => void;
  onEditExpiry?: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
}

export function useDocumentActions({
  onView,
  onDownload,
  onReplace,
  onViewHistory,
  onEditExpiry,
  onDelete,
}: UseDocumentActionsProps = {}) {
  
  const handleView = (documentId: string) => {
    onView?.(documentId);
  };

  const handleDownload = (documentId: string) => {
    onDownload?.(documentId);
  };

  const handleReplace = (documentId: string) => {
    onReplace?.(documentId);
  };

  const handleViewHistory = (documentId: string) => {
    onViewHistory?.(documentId);
  };

  const handleEditExpiry = (documentId: string) => {
    onEditExpiry?.(documentId);
  };

  const handleDelete = (documentId: string) => {
    onDelete?.(documentId);
  };

  return {
    handleView,
    handleDownload,
    handleReplace,
    handleViewHistory,
    handleEditExpiry,
    handleDelete,
  };
}
