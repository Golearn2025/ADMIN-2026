"use client";

import { useEffect, useState } from "react";
import { useDriverActions } from "@/lib/features/drivers/hooks/useDriverActions";
import { useDocumentBulkActions } from "../../hooks/useDocumentBulkActions";
import { AlertCircle, User as UserIcon, Car as CarIcon, Camera } from "lucide-react";
import { BulkActionsBar } from "../BulkActionsBar";
import { InlineRejectPanel } from "../InlineRejectPanel";
import { DocumentTable } from "../DocumentTable";
import { ProfilePhotoCard } from "../ProfilePhotoCard";
import { downloadFile } from "@/lib/utils/downloadFile";
import type { DriverDocument, VehicleDocument } from "@/lib/features/drivers/drivers.types";

interface DriverDocumentsTabProps {
  driverId: string;
  profilePhotoUrl: string | null;
  profilePhotoStatus: "pending" | "approved" | "rejected";
  profilePhotoReviewedBy?: string | null;
  profilePhotoReviewedAt?: string | null;
  profilePhotoRejectionReason?: string | null;
  driverDocuments: DriverDocument[];
  vehicleDocuments: VehicleDocument[];
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
  onRefresh 
}: DriverDocumentsTabProps) {
  const [userId, setUserId] = useState<string>("");
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  
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
      // Refresh documents after approval
      onRefresh();
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
      // Refresh documents after rejection
      onRefresh();
    } catch (error) {
      console.error("Failed to reject:", error);
    }
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
    
    // Find document in both driver and vehicle documents
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
    
    // Find document in both driver and vehicle documents
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
    
    // Find document to get type and entity
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
        
        // Refresh to show new document
        onRefresh();
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
    console.log('📅 Edit expiry:', docId);
    // TODO: Open date picker modal to update expiry date
    // Example: setExpiryModalOpen({ docId, currentExpiry: doc.expiry_date });
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

  const handleApproveProfilePhoto = async () => {
    setIsPhotoProcessing(true);
    try {
      const response = await fetch(`/api/admin/drivers/${driverId}/profile-photo/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to approve profile photo");
      }

      onRefresh();
    } catch (error) {
      console.error("Error approving profile photo:", error);
      alert("Failed to approve profile photo");
    } finally {
      setIsPhotoProcessing(false);
    }
  };

  const handleRejectProfilePhoto = async (reason: string) => {
    setIsPhotoProcessing(true);
    try {
      const response = await fetch(`/api/admin/drivers/${driverId}/profile-photo/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject profile photo");
      }

      onRefresh();
    } catch (error) {
      console.error("Error rejecting profile photo:", error);
      alert("Failed to reject profile photo");
    } finally {
      setIsPhotoProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* SECTION 0: Profile Photo */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Profile Photo</h2>
            <p className="text-sm text-muted-foreground">
              Driver's profile picture for identification and verification
            </p>
          </div>
        </div>

        <ProfilePhotoCard
          driverId={driverId}
          photoUrl={profilePhotoUrl}
          status={profilePhotoStatus}
          reviewedBy={profilePhotoReviewedBy}
          reviewedAt={profilePhotoReviewedAt}
          rejectionReason={profilePhotoRejectionReason}
          onApprove={handleApproveProfilePhoto}
          onReject={handleRejectProfilePhoto}
          onPhotoChange={onRefresh}
          isProcessing={isPhotoProcessing}
        />
      </div>

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
            isDownloading={isDownloading}
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
            isDownloading={isDownloading}
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

