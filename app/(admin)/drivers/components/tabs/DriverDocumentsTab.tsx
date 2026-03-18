"use client";

import { useEffect, useState } from "react";
import { useDriverDocuments } from "@/lib/features/drivers/hooks/useDriverDocuments";
import { useDriverActions } from "@/lib/features/drivers/hooks/useDriverActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, FileText, AlertCircle } from "lucide-react";
import type { DriverDocument, VehicleDocument } from "@/lib/features/drivers/drivers.types";

interface DriverDocumentsTabProps {
  driverId: string;
}

export function DriverDocumentsTab({ driverId }: DriverDocumentsTabProps) {
  const [userId, setUserId] = useState<string>("");
  const documentsState = useDriverDocuments({ driverId });
  const actions = useDriverActions({
    onSuccess: () => {
      documentsState.refetch();
    },
  });

  useEffect(() => {
    setUserId("current-user-id");
  }, []);

  const handleApproveDriverDoc = async (docId: string) => {
    try {
      await actions.approveDriverDocument(docId, userId);
    } catch (error) {
      console.error("Failed to approve document:", error);
    }
  };

  const handleRejectDriverDoc = async (docId: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;

    try {
      await actions.rejectDriverDocument(docId, userId, reason);
    } catch (error) {
      console.error("Failed to reject document:", error);
    }
  };

  const handleApproveVehicleDoc = async (docId: string) => {
    try {
      await actions.approveVehicleDocument(docId, userId);
    } catch (error) {
      console.error("Failed to approve document:", error);
    }
  };

  const handleRejectVehicleDoc = async (docId: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;

    try {
      await actions.rejectVehicleDocument(docId, userId, reason);
    } catch (error) {
      console.error("Failed to reject document:", error);
    }
  };

  if (documentsState.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Driver Documents */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5" />
          Driver Documents
        </h3>

        {documentsState.driverDocuments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No driver documents found</p>
        ) : (
          <div className="space-y-3">
            {documentsState.driverDocuments.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                onApprove={() => handleApproveDriverDoc(doc.id)}
                onReject={() => handleRejectDriverDoc(doc.id)}
                isProcessing={actions.isProcessing}
              />
            ))}
          </div>
        )}
      </div>

      {/* Vehicle Documents */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5" />
          Vehicle Documents
        </h3>

        {documentsState.vehicleDocuments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vehicle documents found</p>
        ) : (
          <div className="space-y-3">
            {documentsState.vehicleDocuments.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                onApprove={() => handleApproveVehicleDoc(doc.id)}
                onReject={() => handleRejectVehicleDoc(doc.id)}
                isProcessing={actions.isProcessing}
              />
            ))}
          </div>
        )}
      </div>

      {actions.error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {actions.error}
        </div>
      )}
    </div>
  );
}

function DocumentRow({
  document,
  onApprove,
  onReject,
  isProcessing,
}: {
  document: DriverDocument | VehicleDocument;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      case "expired":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <p className="font-medium capitalize">
            {document.document_type.replace(/_/g, " ")}
          </p>
          <Badge variant={getStatusBadgeVariant(document.status)}>
            {document.status}
          </Badge>
        </div>
        <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
          {document.expiry_date && (
            <span>Expires: {new Date(document.expiry_date).toLocaleDateString()}</span>
          )}
          <span>Uploaded: {new Date(document.upload_date).toLocaleDateString()}</span>
        </div>
        {document.rejection_reason && (
          <p className="mt-2 text-sm text-destructive">
            Reason: {document.rejection_reason}
          </p>
        )}
      </div>

      {document.status === "pending" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={onApprove}
            disabled={isProcessing}
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onReject}
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
