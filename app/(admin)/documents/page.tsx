"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Upload } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { DocumentStatsCards } from "./components/DocumentStatsCards";
import { DocumentsTable } from "./components/DocumentsTable";
import { apiFetch } from "@/lib/api/apiClient";

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

interface DocumentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expiringSoon: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      const response = await apiFetch('/api/admin/documents');
      const data = await response.json();
      
      if (response.ok) {
        setDocuments(data.documents || []);
      } else {
        alert('Failed to fetch documents');
      }
    } catch (error) {
      alert('Error fetching documents');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (): DocumentStats => {
    const isExpiringSoon = (expiryDate: string | null) => {
      if (!expiryDate) return false;
      const expiry = new Date(expiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
    };

    return {
      total: documents.length,
      pending: documents.filter(d => d.status === 'pending').length,
      approved: documents.filter(d => d.status === 'approved').length,
      rejected: documents.filter(d => d.status === 'rejected').length,
      expiringSoon: documents.filter(d => isExpiringSoon(d.expiry_date)).length
    };
  };

  // Handle document actions
  const handleViewDocument = (document: Document) => {
    if (document.file_url) {
      window.open(document.file_url, '_blank');
    } else {
      alert('No file URL available');
    }
  };

  const handleApproveDocument = (document: Document) => {
    alert('Approve functionality coming soon');
  };

  const handleRejectDocument = (document: Document) => {
    alert('Reject functionality coming soon');
  };

  const handleDownloadDocument = (document: Document) => {
    if (document.file_url) {
      window.open(document.file_url, '_blank');
    } else {
      alert('No file URL available');
    }
  };

  const handleExport = () => {
    alert('Export functionality coming soon');
  };

  const handleUpload = () => {
    alert('Upload functionality coming soon');
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const stats = calculateStats();

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Documents"
          subtitle="Manage driver and vehicle documents"
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm" onClick={handleUpload}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </>
          }
        />
        <div className="flex items-center justify-center py-12">
          <FileText className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Manage driver and vehicle documents"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={handleUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </>
        }
      />

      <div className="space-y-4 md:space-y-6">
        {/* Statistics Cards */}
        <DocumentStatsCards stats={stats} />

        {/* Documents Table */}
        <DocumentsTable
          documents={documents}
          onView={handleViewDocument}
          onApprove={handleApproveDocument}
          onReject={handleRejectDocument}
          onDownload={handleDownloadDocument}
        />
      </div>
    </div>
  );
}
