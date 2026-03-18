// ============================================================================
// useDriverActions - DOCUMENT ACTIONS (APPROVE/REJECT)
// ============================================================================

"use client";

import { useState } from "react";

interface UseDriverActionsProps {
  onSuccess?: () => void;
}

export function useDriverActions({ onSuccess }: UseDriverActionsProps = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveDriverDocument = async (
    documentId: string,
    reviewedBy: string
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/drivers/documents/driver/${documentId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewed_by: reviewedBy }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to approve document");
      }

      onSuccess?.();
      return await response.json();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectDriverDocument = async (
    documentId: string,
    reviewedBy: string,
    reason: string
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/drivers/documents/driver/${documentId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewed_by: reviewedBy, reason }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject document");
      }

      onSuccess?.();
      return await response.json();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const approveVehicleDocument = async (
    documentId: string,
    reviewedBy: string
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/drivers/documents/vehicle/${documentId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewed_by: reviewedBy }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to approve document");
      }

      onSuccess?.();
      return await response.json();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectVehicleDocument = async (
    documentId: string,
    reviewedBy: string,
    reason: string
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/drivers/documents/vehicle/${documentId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewed_by: reviewedBy, reason }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject document");
      }

      onSuccess?.();
      return await response.json();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    approveDriverDocument,
    rejectDriverDocument,
    approveVehicleDocument,
    rejectVehicleDocument,
    isProcessing,
    error,
  };
}
