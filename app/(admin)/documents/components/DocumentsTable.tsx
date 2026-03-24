"use client";

import { useState } from "react";
import { FileText, MoreHorizontal, Eye, CheckCircle, XCircle, Download, User, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Document {
  id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  entity_type: string;
  document_type: string;
  status: string;
  file_url: string | null;
  expiry_date: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  rejection_reason: string | null;
  driver_name?: string | null;
  vehicle_license?: string | null;
}

interface DocumentsTableProps {
  documents: Document[];
  onView?: (document: Document) => void;
  onApprove?: (document: Document) => void;
  onReject?: (document: Document) => void;
  onDownload?: (document: Document) => void;
}

const DOCUMENT_TYPE_LABELS: { [key: string]: string } = {
  pco_licence: "PCO Licence",
  drivers_licence: "Driver's Licence",
  proof_of_identity: "Proof of Identity",
  proof_of_address: "Proof of Address",
  bank_statement: "Bank Statement",
  insurance: "Insurance",
  mot: "MOT Certificate",
  vehicle_registration: "Vehicle Registration",
  logbook: "Logbook"
};

const STATUS_COLORS: { [key: string]: string } = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  expired: "destructive"
};

const STATUS_LABELS: { [key: string]: string } = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired"
};

const ENTITY_TYPE_LABELS: { [key: string]: string } = {
  driver: "Driver",
  vehicle: "Vehicle"
};

export function DocumentsTable({ 
  documents, 
  onView, 
  onApprove, 
  onReject, 
  onDownload 
}: DocumentsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Get unique values for filters
  const uniqueEntityTypes = [...new Set(documents.map(d => d.entity_type))];
  const uniqueDocumentTypes = [...new Set(documents.map(d => d.document_type))];
  const uniqueStatuses = [...new Set(documents.map(d => d.status))];

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.vehicle_license?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      DOCUMENT_TYPE_LABELS[doc.document_type]?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEntityType = entityTypeFilter === "all" || doc.entity_type === entityTypeFilter;
    const matchesDocumentType = documentTypeFilter === "all" || doc.document_type === documentTypeFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;

    return matchesSearch && matchesEntityType && matchesDocumentType && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setEntityTypeFilter("all");
    setDocumentTypeFilter("all");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchTerm || entityTypeFilter !== "all" || documentTypeFilter !== "all" || statusFilter !== "all";

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Documents ({filteredDocuments.length} total)
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 min-w-full sm:min-w-[200px]">
            <Input
              placeholder="Search by driver, vehicle, or document type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueEntityTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {ENTITY_TYPE_LABELS[type]} ({documents.filter(d => d.entity_type === type).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Documents</SelectItem>
              {uniqueDocumentTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {DOCUMENT_TYPE_LABELS[type]} ({documents.filter(d => d.document_type === type).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]} ({documents.filter(d => d.status === status).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Entity</th>
                <th className="text-left p-3 font-medium">Document Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Expiry Date</th>
                <th className="text-left p-3 font-medium">Uploaded</th>
                <th className="text-left p-3 font-medium">Reviewed By</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="border-b hover:bg-muted/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {doc.entity_type === 'driver' ? (
                        <>
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{doc.driver_name || 'Unknown Driver'}</p>
                            <p className="text-xs text-muted-foreground">Driver</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{doc.vehicle_license || 'Unknown Vehicle'}</p>
                            <p className="text-xs text-muted-foreground">Vehicle</p>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm">{DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}</span>
                  </td>
                  <td className="p-3">
                    <Badge variant={STATUS_COLORS[doc.status] as any} className="text-xs">
                      {STATUS_LABELS[doc.status]}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {doc.expiry_date ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{formatDate(doc.expiry_date)}</span>
                        {isExpiringSoon(doc.expiry_date) && (
                          <Badge variant="destructive" className="text-xs">
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">N/A</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">{formatDate(doc.created_at)}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">
                      {doc.reviewed_by_name || 'Not reviewed'}
                    </span>
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onView && (
                          <DropdownMenuItem onClick={() => onView(doc)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Document
                          </DropdownMenuItem>
                        )}
                        {onApprove && doc.status === 'pending' && (
                          <DropdownMenuItem onClick={() => onApprove(doc)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        {onReject && doc.status === 'pending' && (
                          <DropdownMenuItem onClick={() => onReject(doc)} className="text-red-600">
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </DropdownMenuItem>
                        )}
                        {onDownload && (
                          <DropdownMenuItem onClick={() => onDownload(doc)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredDocuments.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No documents found</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
