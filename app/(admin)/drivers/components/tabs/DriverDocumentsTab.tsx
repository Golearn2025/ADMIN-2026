"use client";

import { useEffect, useMemo, useState } from "react";
import { useDriverActions } from "@/lib/features/drivers/hooks/useDriverActions";
import { useDocumentBulkActions } from "../../hooks/useDocumentBulkActions";
import { AlertCircle, User as UserIcon, Car as CarIcon, Camera } from "lucide-react";
import { BulkActionsBar } from "../BulkActionsBar";
import { InlineRejectPanel } from "../InlineRejectPanel";
import { DocumentTable } from "../DocumentTable";
import { downloadFile } from "@/lib/utils/downloadFile";
import type { DriverDocument, VehicleDocument } from "@/lib/features/drivers/drivers.types";
import {
  DRIVER_DOC_LABELS,
  REQUIRED_VEHICLE_PAPER_TYPES,
  REQUIRED_VEHICLE_PHOTO_TYPES,
  VEHICLE_DOC_LABELS,
  VEHICLE_PHOTO_LABELS,
} from "@/lib/features/drivers/compliance.utils";
import { EditExpiryDialog } from "../EditExpiryDialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function isVehiclePhotoDoc(doc: VehicleDocument): boolean {
  return Boolean(VEHICLE_PHOTO_LABELS[doc.document_type]);
}

/** Fill required paper/photo slots so a new car shows Missing, not an empty table. */
function withMissingVehicleSlots(
  vehicleId: string,
  existing: VehicleDocument[],
  types: string[]
): VehicleDocument[] {
  const byType = new Map(existing.map((d) => [d.document_type, d]));
  return types.map((type) => {
    const found = byType.get(type);
    if (found) return found;
    return {
      id: `missing-${vehicleId}-${type}`,
      vehicle_id: vehicleId,
      document_type: type,
      status: "missing" as VehicleDocument["status"],
      expiry_date: null,
      created_at: "",
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
      file_url: null,
      file_name: null,
    };
  });
}

type DocumentsVehicle = {
  id?: string;
  vehicle_id?: string;
  license_plate?: string;
  plate?: string;
  status?: string;
  model_name?: string;
  model_id?: string;
};

function vehicleRowId(v: DocumentsVehicle): string | null {
  return v.vehicle_id || v.id || null;
}

function vehicleLabel(v: DocumentsVehicle): string {
  const plate = v.license_plate || v.plate || "No plate";
  const model = v.model_name || v.model_id || "";
  return model ? `${plate} · ${model}` : plate;
}

interface DriverDocumentsTabProps {
  driverId: string;
  profilePhotoUrl: string | null;
  profilePhotoStatus: "pending" | "approved" | "rejected";
  profilePhotoReviewedBy?: string | null;
  profilePhotoReviewedAt?: string | null;
  profilePhotoRejectionReason?: string | null;
  driverDocuments: DriverDocument[];
  vehicleDocuments: VehicleDocument[];
  vehicles?: DocumentsVehicle[];
  onRefresh: () => void;
}

export function DriverDocumentsTab({ 
  driverId,
  profilePhotoUrl,
  profilePhotoStatus,
  profilePhotoReviewedBy,
  profilePhotoReviewedAt,
  profilePhotoRejectionReason,
  driverDocuments, 
  vehicleDocuments,
  vehicles = [],
  onRefresh 
}: DriverDocumentsTabProps) {
  const [userId, setUserId] = useState<string>("");
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [expiryEdit, setExpiryEdit] = useState<{
    docId: string;
    label: string;
    currentExpiry: string | null;
    entityType: "driver" | "vehicle";
  } | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const actions = useDriverActions({ onSuccess: onRefresh });

  const sortedVehicles = useMemo(() => {
    const list = [...vehicles].filter((v) => vehicleRowId(v));
    list.sort((a, b) => {
      const aActive = a.status === "active" ? 0 : 1;
      const bActive = b.status === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return vehicleLabel(a).localeCompare(vehicleLabel(b));
    });
    return list;
  }, [vehicles]);

  // Prefer active vehicle; keep selection if still present
  useEffect(() => {
    if (!sortedVehicles.length) {
      setSelectedVehicleId(null);
      return;
    }
    const stillValid = sortedVehicles.some(
      (v) => vehicleRowId(v) === selectedVehicleId
    );
    if (stillValid) return;
    const active = sortedVehicles.find((v) => v.status === "active");
    setSelectedVehicleId(vehicleRowId(active || sortedVehicles[0]));
  }, [sortedVehicles, selectedVehicleId]);

  const selectedVehicleDocs = useMemo(() => {
    if (!selectedVehicleId) return [];
    return vehicleDocuments.filter((doc) => doc.vehicle_id === selectedVehicleId);
  }, [vehicleDocuments, selectedVehicleId]);
  
  const bulkActions = useDocumentBulkActions({
    driverDocuments,
    vehicleDocuments: selectedVehicleDocs,
    onRefresh,
  });

  // Clear selection when vehicle changes to avoid approving another car's docs
  useEffect(() => {
    bulkActions.clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when selected vehicle changes
  }, [selectedVehicleId]);

  const vehiclePaperDocuments = useMemo(() => {
    if (!selectedVehicleId) return [];
    const existing = selectedVehicleDocs.filter((doc) => !isVehiclePhotoDoc(doc));
    // Keep optional hire_agreement if present, plus required paper slots
    const required = withMissingVehicleSlots(
      selectedVehicleId,
      existing,
      REQUIRED_VEHICLE_PAPER_TYPES
    );
    const hire = existing.find((d) => d.document_type === "hire_agreement");
    return hire && !required.some((d) => d.document_type === "hire_agreement")
      ? [...required, hire]
      : required;
  }, [selectedVehicleDocs, selectedVehicleId]);

  const vehiclePhotoDocuments = useMemo(() => {
    if (!selectedVehicleId) return [];
    const existing = selectedVehicleDocs.filter(isVehiclePhotoDoc);
    return withMissingVehicleSlots(
      selectedVehicleId,
      existing,
      REQUIRED_VEHICLE_PHOTO_TYPES
    );
  }, [selectedVehicleDocs, selectedVehicleId]);

  const selectedVehicle = sortedVehicles.find(
    (v) => vehicleRowId(v) === selectedVehicleId
  );

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

  // ✅ NO MORE FAKE PROFILE PHOTO - use real DB data only

  const handleApprove = async (docId: string) => {
  const isDriverDoc = driverDocuments.some(d => d.id === docId);

  if (isDriverDoc) {
    await actions.approveDriverDocument(docId, userId);
  } else {
    await actions.approveVehicleDocument(docId, userId);
  }

  // ✅ NO MANUAL REFRESH - let realtime handle UI update
};

  const handleReject = async (docId: string) => {
  const reason = prompt("Rejection reason:");
  if (!reason) return;
  
  const isDriverDoc = driverDocuments.some(d => d.id === docId);

  if (isDriverDoc) {
    await actions.rejectDriverDocument(docId, userId, reason);
  } else {
    await actions.rejectVehicleDocument(docId, userId, reason);
  }

  // ✅ NO MANUAL REFRESH - let realtime handle UI update
};

  // Document action handlers
  const handleDocumentAction = (action: string, docId: string) => {
    console.log(`Document action: ${action}`, docId);
    
    switch (action) {
      case 'view':
        handleViewDocument(docId);
        break;
      case 'download':
        handleDownloadDocument(docId);
        break;
      case 'replace':
        handleReplaceDocument(docId);
        break;
      case 'history':
        handleViewHistory(docId);
        break;
      case 'edit-expiry':
        handleEditExpiry(docId);
        break;
      case 'delete':
        handleDeleteDocument(docId);
        break;
      default:
        console.warn('Unknown action:', action);
    }
  };

  const handleViewDocument = (docId: string) => {
    console.log('📄 View document:', docId);
    
    // Find document in real documents only (no fake profile photo)
    const doc = [...driverDocuments, ...vehicleDocuments].find(d => d.id === docId);
    
    if (!doc) {
      console.error('Document not found:', docId);
      alert('Document not found');
      return;
    }
    
    if (!doc.file_url) {
      console.error('Document has no file URL:', docId);
      alert('Document file is not available');
      return;
    }
    
    // Open document in new tab
    window.open(doc.file_url, '_blank');
  };

  const handleDownloadDocument = async (docId: string) => {
    console.log('⬇️ Download document:', docId);
    
    // Find document in real documents only (no fake profile photo)
    const doc = [...driverDocuments, ...vehicleDocuments].find(d => d.id === docId);
    
    if (!doc) {
      console.error('Document not found:', docId);
      alert('Document not found');
      return;
    }
    
    if (!doc.file_url) {
      console.error('Document has no file URL:', docId);
      alert('Document file is not available');
      return;
    }
    
    // Set loading state
    setIsDownloading(docId);
    
    try {
      // Create meaningful filename
      const fileExtension = doc.file_url.split('.').pop()?.split('?')[0] || 'pdf';
      const fileName = doc.file_name || `${doc.document_type.replace(/_/g, '-')}.${fileExtension}`;
      
      console.log('📥 Downloading:', fileName);
      
      // Use downloadFile utility to fetch + blob + download
      await downloadFile(doc.file_url, fileName);
      
      console.log('✅ Download completed');
    } catch (error) {
      console.error('❌ Download failed:', error);
      alert('Failed to download document. Please try again.');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleReplaceDocument = async (docId: string) => {
    console.log('📤 Replace document:', docId);
    
    // Find document in real documents only (no fake profile photo)
    const doc = [...driverDocuments, ...vehicleDocuments].find(d => d.id === docId);
    
    if (!doc) {
      alert('Document not found');
      return;
    }

    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File must be smaller than 10MB');
        return;
      }

      setIsDownloading(docId); // Reuse loading state

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', doc.document_type);
        formData.append('entityType', 'driver_id' in doc ? 'driver' : 'vehicle');
        formData.append('documentId', docId);

        const response = await fetch(`/api/admin/drivers/${driverId}/replace-document`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to replace document');
        }

        console.log('✅ Document replaced successfully');
        
        // ✅ NO MANUAL REFRESH - let realtime handle UI update
      } catch (error) {
        console.error('❌ Replace failed:', error);
        alert('Failed to replace document. Please try again.');
      } finally {
        setIsDownloading(null);
      }
    };

    input.click();
  };

  const handleViewHistory = (docId: string) => {
    console.log('📜 View history:', docId);
    // TODO: Fetch and display document status change history
    // Example: 
    // const history = await fetchDocumentHistory(docId);
    // setHistoryModalOpen({ docId, history });
  };

  const handleEditExpiry = (docId: string) => {
    const doc = [...driverDocuments, ...vehicleDocuments].find((d) => d.id === docId);
    if (!doc) {
      toast({
        title: "Document not found",
        variant: "destructive",
      });
      return;
    }

    const isDriverDoc = driverDocuments.some((d) => d.id === docId);
    const label =
      (isDriverDoc ? DRIVER_DOC_LABELS[doc.document_type] : VEHICLE_DOC_LABELS[doc.document_type]) ||
      doc.document_type.replace(/_/g, " ");

    setExpiryEdit({
      docId,
      label,
      currentExpiry: doc.expiry_date,
      entityType: isDriverDoc ? "driver" : "vehicle",
    });
  };

  const handleSaveExpiry = async (expiryDate: string | null) => {
    if (!expiryEdit) return;

    try {
      await actions.updateDocumentExpiry(
        expiryEdit.docId,
        expiryEdit.entityType,
        expiryDate
      );
      toast({
        title: "Expiry date updated",
        description: expiryDate
          ? `New expiry: ${new Date(expiryDate).toLocaleDateString("en-GB")}`
          : "Expiry date cleared",
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Failed to update expiry date",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = (docId: string) => {
    console.log('🗑️ Delete document:', docId);
    // TODO: Show confirmation dialog and delete
    // Example:
    // if (confirm('Are you sure you want to delete this document?')) {
    //   await deleteDocument(docId);
    //   onRefresh();
    // }
  };

  // ✅ NO MORE FAKE PROFILE PHOTO HANDLERS - use real DB data only

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

      {/* SECTION 1: Driver Documents (includes Profile Photo) */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <UserIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Driver Documents</h2>
            <p className="text-sm text-muted-foreground">
              Profile photo and personal identification documents
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
            isDownloading={isDownloading}
          />
        </div>
      </div>

      {/* Vehicle picker — docs/photos scoped to one car when driver has multiple */}
      {sortedVehicles.length > 0 && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold">Vehicle</h2>
            <p className="text-xs text-muted-foreground">
              Documents and photos below are only for the selected car
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedVehicles.map((v) => {
              const id = vehicleRowId(v);
              if (!id) return null;
              const active = id === selectedVehicleId;
              const count = vehicleDocuments.filter((d) => d.vehicle_id === id).length;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedVehicleId(id)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <div className="font-medium text-foreground">{vehicleLabel(v)}</div>
                  <div className="text-xs capitalize">
                    {v.status || "unknown"}
                    {count > 0 ? ` · ${count} docs` : " · no docs yet"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: Vehicle papers */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
            <CarIcon className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Vehicle Documents</h2>
            <p className="text-sm text-muted-foreground">
              {selectedVehicle
                ? `PHV, MOT, insurance, V5C for ${vehicleLabel(selectedVehicle)}`
                : "PHV, MOT, insurance, V5C, and hire agreement"}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          {sortedVehicles.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No vehicles on this driver.</p>
          ) : (
            <DocumentTable
              documents={vehiclePaperDocuments}
              selectedIds={bulkActions.selectedDocuments}
              onToggleSelect={bulkActions.toggleDocument}
              onToggleSelectAll={() =>
                bulkActions.toggleSectionDocs(
                  vehiclePaperDocuments.filter((d) => !d.id.startsWith("missing-"))
                )
              }
              onApprove={handleApprove}
              onReject={handleReject}
              onDocumentAction={handleDocumentAction}
              isProcessing={actions.isProcessing}
              isDownloading={isDownloading}
            />
          )}
        </div>
      </div>

      {/* SECTION 3: Vehicle photos — same approve/reject flow as papers */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <Camera className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Vehicle Photos</h2>
            <p className="text-sm text-muted-foreground">
              {selectedVehicle
                ? `Photos for ${vehicleLabel(selectedVehicle)}`
                : "Exterior front/rear and interior front/rear"}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          {sortedVehicles.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No vehicles on this driver.</p>
          ) : (
            <DocumentTable
              documents={vehiclePhotoDocuments}
              selectedIds={bulkActions.selectedDocuments}
              onToggleSelect={bulkActions.toggleDocument}
              onToggleSelectAll={() =>
                bulkActions.toggleSectionDocs(
                  vehiclePhotoDocuments.filter((d) => !d.id.startsWith("missing-"))
                )
              }
              onApprove={handleApprove}
              onReject={handleReject}
              onDocumentAction={handleDocumentAction}
              isProcessing={actions.isProcessing}
              isDownloading={isDownloading}
            />
          )}
        </div>
      </div>

      {actions.error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {actions.error}
        </div>
      )}

      <EditExpiryDialog
        open={expiryEdit !== null}
        onOpenChange={(open) => {
          if (!open) setExpiryEdit(null);
        }}
        documentLabel={expiryEdit?.label ?? "Document"}
        currentExpiry={expiryEdit?.currentExpiry ?? null}
        onSave={handleSaveExpiry}
        isProcessing={actions.isProcessing}
      />
    </div>
  );
}

