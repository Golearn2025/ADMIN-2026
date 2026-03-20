"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, FileText } from "lucide-react";
import { DocumentActions } from "./actions/DocumentActions";
import type { DriverDocument, VehicleDocument } from "@/lib/features/drivers/drivers.types";

const DOCUMENT_LABELS: Record<string, string> = {
  driving_licence: "Driving Licence",
  electronic_counterpart: "Electronic Counterpart",
  pco_licence: "PCO Licence",
  bank_statement: "Bank Statement",
  proof_of_identity: "Proof of Identity",
  proof_of_address: "Proof of Address",
  phv_licence: "PHV Licence",
  mot_certificate: "MOT Certificate",
  insurance_certificate: "Insurance Certificate",
  v5c_logbook: "V5C Logbook",
  hire_agreement: "Hire Agreement",
};

interface DocumentTableProps {
  documents: (DriverDocument | VehicleDocument)[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDocumentAction: (action: string, id: string) => void;
  isProcessing: boolean;
}

export function DocumentTable({
  documents,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onApprove,
  onReject,
  onDocumentAction,
  isProcessing,
}: DocumentTableProps) {
  if (documents.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">No documents found</p>;
  }

  const allSelected = documents.length > 0 && selectedIds.length === documents.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-[5%]" />
          <col className="w-[23%]" />
          <col className="w-[12%]" />
          <col className="w-[13%]" />
          <col className="w-[13%]" />
          <col className="w-[13%]" />
          <col className="w-[21%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="p-4 text-center">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleSelectAll}
              />
            </th>
            <th className="p-4 text-left text-sm font-semibold">Document Type</th>
            <th className="p-4 text-center text-sm font-semibold">Status</th>
            <th className="p-4 text-center text-sm font-semibold">Expiry Date</th>
            <th className="p-4 text-center text-sm font-semibold">Uploaded</th>
            <th className="p-4 text-center text-sm font-semibold">Verified By</th>
            <th className="p-4 text-right text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              isSelected={selectedIds.includes(doc.id)}
              onToggleSelect={() => onToggleSelect(doc.id)}
              onApprove={() => onApprove(doc.id)}
              onReject={() => onReject(doc.id)}
              onDocumentAction={onDocumentAction}
              isProcessing={isProcessing}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentRow({
  document,
  isSelected,
  onToggleSelect,
  onApprove,
  onReject,
  onDocumentAction,
  isProcessing,
}: {
  document: DriverDocument | VehicleDocument;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDocumentAction: (action: string, docId: string) => void;
  isProcessing: boolean;
}) {
  const isExpired = (expiryDate: string | null): boolean => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const getStatusBadgeVariant = (status: string, expiryDate: string | null) => {
    if (isExpired(expiryDate)) return "destructive";
    
    switch (status) {
      case "approved":
        return "default"; // green
      case "pending":
        return "outline"; // yellow
      case "rejected":
        return "destructive"; // red
      default:
        return "outline";
    }
  };

  const getStatusText = (status: string, expiryDate: string | null): string => {
    if (isExpired(expiryDate)) return "expired";
    return status;
  };

  return (
    <tr className="border-b border-border last:border-0 transition-colors hover:bg-muted/30">
      <td className="p-4 text-center">
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <p className="font-medium">
            {document.document_type 
              ? DOCUMENT_LABELS[document.document_type] || document.document_type.replace(/_/g, " ")
              : "Unknown Document"}
          </p>
        </div>
      </td>
      <td className="p-4 text-center">
        <div className="inline-flex flex-col items-center gap-1.5">
          <Badge variant={getStatusBadgeVariant(document.status, document.expiry_date)}>
            {getStatusText(document.status, document.expiry_date)}
          </Badge>
          {document.rejection_reason && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-destructive/30 text-destructive/80 bg-destructive/5">
              {document.rejection_reason}
            </Badge>
          )}
        </div>
      </td>
      <td className="p-4 text-center text-sm text-muted-foreground">
        {document.expiry_date
          ? new Date(document.expiry_date).toLocaleDateString()
          : "N/A"}
      </td>
      <td className="p-4 text-center text-sm text-muted-foreground">
        {document.created_at
          ? new Date(document.created_at).toLocaleDateString()
          : "-"}
      </td>
      <td className="p-4 text-center">
        {document.reviewed_by_name ? (
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-foreground">{document.reviewed_by_name}</p>
            {document.reviewed_by_email && (
              <p className="text-xs text-muted-foreground">{document.reviewed_by_email}</p>
            )}
            {document.reviewed_by_role && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                {document.reviewed_by_role}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Pending review</span>
        )}
      </td>
      <td className="p-4">
        <div className="flex items-center justify-end gap-2">
          {document.status === "pending" ? (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={onApprove}
                disabled={isProcessing}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onReject}
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          ) : (
            <DocumentActions
              documentId={document.id}
              onView={() => onDocumentAction('view', document.id)}
              onDownload={() => onDocumentAction('download', document.id)}
              onReplace={() => onDocumentAction('replace', document.id)}
              onViewHistory={() => onDocumentAction('history', document.id)}
              onEditExpiry={() => onDocumentAction('edit-expiry', document.id)}
              onDelete={() => onDocumentAction('delete', document.id)}
              showDelete={false}
            />
          )}
        </div>
      </td>
    </tr>
  );
}
