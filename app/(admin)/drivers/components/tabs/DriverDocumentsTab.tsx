"use client";

import { useEffect, useState } from "react";
import { useDriverActions } from "@/lib/features/drivers/hooks/useDriverActions";
import { useDocumentBulkActions } from "../../hooks/useDocumentBulkActions";
import { AlertCircle, User as UserIcon, Car as CarIcon } from "lucide-react";
import { BulkActionsBar } from "../BulkActionsBar";
import { InlineRejectPanel } from "../InlineRejectPanel";
import { DocumentTable } from "../DocumentTable";
import type { DriverDocument, VehicleDocument } from "@/lib/features/drivers/drivers.types";

interface DriverDocumentsTabProps {
  driverId: string;
  driverDocuments: DriverDocument[];
  vehicleDocuments: VehicleDocument[];
  onRefresh: () => void;
}

export function DriverDocumentsTab({ 
  driverId, 
  driverDocuments, 
  vehicleDocuments,
  onRefresh 
}: DriverDocumentsTabProps) {
  const [userId, setUserId] = useState<string>("");
  
  const actions = useDriverActions({ onSuccess: onRefresh });
  
  const bulkActions = useDocumentBulkActions({
    driverDocuments,
    vehicleDocuments,
    onRefresh,
  });

  // Debug: Check if reviewed_by_name is present
  useEffect(() => {
    if (driverDocuments.length > 0) {
      console.log("📄 DRIVER DOCUMENT SAMPLE:", driverDocuments[0]);
      console.log("   reviewed_by:", driverDocuments[0].reviewed_by);
      console.log("   reviewed_by_name:", driverDocuments[0].reviewed_by_name);
    }
    if (vehicleDocuments.length > 0) {
      console.log("🚗 VEHICLE DOCUMENT SAMPLE:", vehicleDocuments[0]);
      console.log("   reviewed_by:", vehicleDocuments[0].reviewed_by);
      console.log("   reviewed_by_name:", vehicleDocuments[0].reviewed_by_name);
    }
  }, [driverDocuments, vehicleDocuments]);

  useEffect(() => {
    setUserId("current-user-id");
  }, []);

  const handleApprove = async (docId: string) => {
    const isDriverDoc = driverDocuments.some(d => d.id === docId);
    try {
      if (isDriverDoc) {
        await actions.approveDriverDocument(docId, userId);
      } else {
        await actions.approveVehicleDocument(docId, userId);
      }
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleReject = async (docId: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    
    const isDriverDoc = driverDocuments.some(d => d.id === docId);
    try {
      if (isDriverDoc) {
        await actions.rejectDriverDocument(docId, userId, reason);
      } else {
        await actions.rejectVehicleDocument(docId, userId, reason);
      }
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  };

  const handleDocumentAction = (action: string, docId: string) => {
    console.log(`Document action: ${action}`, docId);
  };

  return (
    <div className="space-y-8">
      {/* Unified Bulk Actions - Sticky at top */}
      {bulkActions.selectedDocuments.length > 0 && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border pb-4 mb-4">
          <div className="relative">
            <BulkActionsBar
              selectedCount={bulkActions.selectedDocuments.length}
              onApprove={bulkActions.handleBulkApprove}
              onReject={() => bulkActions.setShowRejectPanel(!bulkActions.showRejectPanel)}
              onClear={bulkActions.clearSelection}
              isProcessing={bulkActions.isBulkProcessing}
              isRejectPanelOpen={bulkActions.showRejectPanel}
            />
            {bulkActions.showRejectPanel && (
              <InlineRejectPanel
                onSubmit={bulkActions.handleBulkReject}
                onCancel={() => bulkActions.setShowRejectPanel(false)}
                isProcessing={bulkActions.isBulkProcessing}
              />
            )}
          </div>
        </div>
      )}

      {/* SECTION 1: Driver Documents */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <UserIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Driver Documents</h2>
            <p className="text-sm text-muted-foreground">
              Personal identification and licensing documents
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <DocumentTable
            documents={driverDocuments}
            selectedIds={bulkActions.selectedDocuments}
            onToggleSelect={bulkActions.toggleDocument}
            onToggleSelectAll={() => bulkActions.toggleSectionDocs(driverDocuments)}
            onApprove={handleApprove}
            onReject={handleReject}
            onDocumentAction={handleDocumentAction}
            isProcessing={actions.isProcessing}
          />
        </div>
      </div>

      {/* SECTION 2: Vehicle Documents */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
            <CarIcon className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Vehicle Documents</h2>
            <p className="text-sm text-muted-foreground">
              Vehicle registration, insurance, and inspection documents
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <DocumentTable
            documents={vehicleDocuments}
            selectedIds={bulkActions.selectedDocuments}
            onToggleSelect={bulkActions.toggleDocument}
            onToggleSelectAll={() => bulkActions.toggleSectionDocs(vehicleDocuments)}
            onApprove={handleApprove}
            onReject={handleReject}
            onDocumentAction={handleDocumentAction}
            isProcessing={actions.isProcessing}
          />
        </div>
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

