import { useState } from "react";
import type { DriverDocument, VehicleDocument } from "@/lib/features/drivers/drivers.types";

interface UseDocumentBulkActionsProps {
  driverDocuments: DriverDocument[];
  vehicleDocuments: VehicleDocument[];
  onRefresh: () => void;
}

export function useDocumentBulkActions({
  driverDocuments,
  vehicleDocuments,
  onRefresh,
}: UseDocumentBulkActionsProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const allDocuments = [...driverDocuments, ...vehicleDocuments];

  const toggleDocument = (docId: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleAllDocuments = () => {
    const allDocIds = allDocuments.map((d) => d.id);
    if (selectedDocuments.length === allDocIds.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(allDocIds);
    }
  };

  const toggleSectionDocs = (docs: (DriverDocument | VehicleDocument)[]) => {
    const docIds = docs.map((d) => d.id);
    const allSelected = docIds.every((id) => selectedDocuments.includes(id));

    if (allSelected) {
      setSelectedDocuments((prev) => prev.filter((id) => !docIds.includes(id)));
    } else {
      setSelectedDocuments((prev) => [...new Set([...prev, ...docIds])]);
    }
  };

  const clearSelection = () => {
    setSelectedDocuments([]);
  };

  const handleBulkApprove = async () => {
    console.log("🟢 APPROVE CLICKED");
    console.log("Selected IDs:", selectedDocuments);
    
    setIsBulkProcessing(true);
    try {
      const driverDocIds = selectedDocuments.filter((id) =>
        driverDocuments.some((d) => d.id === id)
      );
      const vehicleDocIds = selectedDocuments.filter((id) =>
        vehicleDocuments.some((d) => d.id === id)
      );

      console.log("Driver Doc IDs:", driverDocIds);
      console.log("Vehicle Doc IDs:", vehicleDocIds);

      if (driverDocIds.length > 0) {
        console.log("🚀 Sending DRIVER approve request...");
        const response = await fetch("/api/admin/documents/bulk-action", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approve",
            document_ids: driverDocIds,
            document_type: "driver",
          }),
        });
        console.log("Driver Approve Response Status:", response.status);
        const data = await response.json();
        console.log("Driver Approve Response Data:", data);
      }

      if (vehicleDocIds.length > 0) {
        console.log("🚀 Sending VEHICLE approve request...");
        const response = await fetch("/api/admin/documents/bulk-action", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approve",
            document_ids: vehicleDocIds,
            document_type: "vehicle",
          }),
        });
        console.log("Vehicle Approve Response Status:", response.status);
        const data = await response.json();
        console.log("Vehicle Approve Response Data:", data);
      }

      setSelectedDocuments([]);
      console.log("✅ APPROVE REFRESH TRIGGERED");
      onRefresh();
    } catch (error) {
      console.error("❌ Bulk approve error:", error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkReject = async (reason: string) => {
    console.log("🔴 REJECT CLICKED");
    console.log("Selected IDs:", selectedDocuments);
    console.log("Reason:", reason);
    
    setIsBulkProcessing(true);
    try {
      const driverDocIds = selectedDocuments.filter((id) =>
        driverDocuments.some((d) => d.id === id)
      );
      const vehicleDocIds = selectedDocuments.filter((id) =>
        vehicleDocuments.some((d) => d.id === id)
      );

      console.log("Driver Doc IDs:", driverDocIds);
      console.log("Vehicle Doc IDs:", vehicleDocIds);

      if (driverDocIds.length > 0) {
        console.log("🚀 Sending DRIVER reject request...");
        const response = await fetch("/api/admin/documents/bulk-action", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reject",
            document_ids: driverDocIds,
            document_type: "driver",
            reason,
          }),
        });
        console.log("Driver Response Status:", response.status);
        const data = await response.json();
        console.log("Driver Response Data:", data);
        if (data.details) {
          console.error("❌ DATABASE ERROR DETAILS:", data.details);
        }
      }

      if (vehicleDocIds.length > 0) {
        console.log("🚀 Sending VEHICLE reject request...");
        const response = await fetch("/api/admin/documents/bulk-action", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reject",
            document_ids: vehicleDocIds,
            document_type: "vehicle",
            reason,
          }),
        });
        console.log("Vehicle Response Status:", response.status);
        const data = await response.json();
        console.log("Vehicle Response Data:", data);
        if (data.details) {
          console.error("❌ DATABASE ERROR DETAILS:", data.details);
        }
      }

      setSelectedDocuments([]);
      setShowRejectPanel(false);
      console.log("✅ REFRESH TRIGGERED");
      onRefresh();
    } catch (error) {
      console.error("❌ Bulk reject error:", error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return {
    selectedDocuments,
    showRejectPanel,
    isBulkProcessing,
    toggleDocument,
    toggleAllDocuments,
    toggleSectionDocs,
    clearSelection,
    handleBulkApprove,
    handleBulkReject,
    setShowRejectPanel,
  };
}
