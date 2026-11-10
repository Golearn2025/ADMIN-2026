"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { EntitySearchPicker, type EntityOption } from "@/components/common/entity-search-picker";
import { FileDropzone } from "@/components/common/file-dropzone";
import { PageHeader } from "@/components/common";
import { DataTableShell } from "@/components/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api/apiClient";
import {
  createDocumentsColumns,
  documentTypeLabel,
  type AdminDocumentRow,
} from "./documents.columns";

const DOC_TYPES = [
  "pco_licence",
  "drivers_licence",
  "proof_of_identity",
  "proof_of_address",
  "bank_statement",
  "insurance",
  "mot",
  "vehicle_registration",
  "logbook",
  "exterior_front",
  "exterior_rear",
  "interior_front",
  "interior_rear",
  "hire_agreement",
];

export default function DocumentsPage() {
  const [rows, setRows] = useState<AdminDocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [entityType, setEntityType] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadEntity, setUploadEntity] = useState<"driver" | "vehicle">(
    "driver"
  );
  const [uploadDocType, setUploadDocType] = useState("drivers_licence");
  const [uploadOwnerId, setUploadOwnerId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [replaceRow, setReplaceRow] = useState<AdminDocumentRow | null>(null);

  const [expiryRow, setExpiryRow] = useState<AdminDocumentRow | null>(null);
  const [expiryDate, setExpiryDate] = useState("");

  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<{
    total: number;
    driver: number;
    vehicle: number;
    cutoff: string;
  } | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const [driverOptions, setDriverOptions] = useState<EntityOption[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<EntityOption[]>([]);
  const [pickersLoading, setPickersLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        entityType,
        status,
        ...(searchValue.trim() ? { q: searchValue.trim() } : {}),
      });
      const res = await apiFetch(`/api/admin/documents?${params}`);
      const data = await res.json();
      if (res.ok) {
        setRows(data.documents || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, entityType, status, searchValue]);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [searchValue, entityType, status]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPickersLoading(true);
      try {
        const [driversRes, vehiclesRes] = await Promise.all([
          apiFetch("/api/admin/communications/drivers"),
          apiFetch("/api/admin/vehicles"),
        ]);
        const driversJson = await driversRes.json();
        const vehiclesJson = await vehiclesRes.json();
        if (cancelled) return;
        setDriverOptions(
          (driversJson.drivers || []).map(
            (d: { id: string; name: string; email?: string | null }) => ({
              id: d.id,
              label: d.name,
              sublabel: d.email || null,
            })
          )
        );
        setVehicleOptions(
          (vehiclesJson.vehicles || []).map(
            (v: {
              id: string;
              license_plate?: string;
              make?: string;
              model?: string;
              model_id?: string;
              year?: number;
              driver_name?: string | null;
            }) => ({
              id: v.id,
              label: v.license_plate || v.id.slice(0, 8),
              sublabel: [
                v.make || v.model
                  ? [v.make, v.model].filter(Boolean).join(" ")
                  : v.model_id
                      ?.split(/[-_]+/)
                      .map(
                        (w) => w.charAt(0).toUpperCase() + w.slice(1)
                      )
                      .join(" "),
                v.year,
                v.driver_name,
              ]
                .filter(Boolean)
                .join(" · "),
            })
          )
        );
      } finally {
        if (!cancelled) setPickersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allVisibleSelected =
    rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !rows.some((r) => r.id === id))
      );
    } else {
      setSelectedIds((prev) => [
        ...new Set([...prev, ...rows.map((r) => r.id)]),
      ]);
    }
  };

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.includes(r.id)),
    [rows, selectedIds]
  );

  const runBulk = async (action: "approve" | "reject", reason?: string) => {
    if (!selectedRows.length) return;
    setBusy(true);
    try {
      const driverIds = selectedRows
        .filter((r) => r.entity_type === "driver")
        .map((r) => r.id);
      const vehicleIds = selectedRows
        .filter((r) => r.entity_type === "vehicle")
        .map((r) => r.id);

      const bodyBase = { action, ...(reason ? { reason } : {}) };
      if (driverIds.length) {
        await apiFetch("/api/admin/documents/bulk-action", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...bodyBase,
            document_ids: driverIds,
            document_type: "driver",
          }),
        });
      }
      if (vehicleIds.length) {
        await apiFetch("/api/admin/documents/bulk-action", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...bodyBase,
            document_ids: vehicleIds,
            document_type: "vehicle",
          }),
        });
      }
      setSelectedIds([]);
      setRejectOpen(false);
      setRejectReason("");
      await fetchDocuments();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (row: AdminDocumentRow) => {
    if (!confirm("Delete this document from DB and storage?")) return;
    setBusy(true);
    try {
      await apiFetch("/api/admin/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_ids: [row.id],
          document_type: row.entity_type === "vehicle" ? "vehicle" : "driver",
        }),
      });
      setSelectedIds((prev) => prev.filter((id) => id !== row.id));
      await fetchDocuments();
    } finally {
      setBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedRows.length) return;
    if (!confirm(`Delete ${selectedRows.length} document(s)?`)) return;
    setBusy(true);
    try {
      const driverIds = selectedRows
        .filter((r) => r.entity_type === "driver")
        .map((r) => r.id);
      const vehicleIds = selectedRows
        .filter((r) => r.entity_type === "vehicle")
        .map((r) => r.id);
      if (driverIds.length) {
        await apiFetch("/api/admin/documents", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_ids: driverIds,
            document_type: "driver",
          }),
        });
      }
      if (vehicleIds.length) {
        await apiFetch("/api/admin/documents", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_ids: vehicleIds,
            document_type: "vehicle",
          }),
        });
      }
      setSelectedIds([]);
      await fetchDocuments();
    } finally {
      setBusy(false);
    }
  };

  const openNewUpload = () => {
    setReplaceRow(null);
    setUploadEntity("driver");
    setUploadDocType("drivers_licence");
    setUploadOwnerId(null);
    setUploadFile(null);
    setUploadOpen(true);
  };

  const openCleanup = async () => {
    setCleanupOpen(true);
    setCleanupPreview(null);
    setCleanupLoading(true);
    try {
      const res = await apiFetch("/api/admin/documents/cleanup-expired", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "preview", entityType: "all" }),
      });
      const data = await res.json();
      if (res.ok) {
        setCleanupPreview({
          total: data.total || 0,
          driver: data.driver || 0,
          vehicle: data.vehicle || 0,
          cutoff: data.cutoff || "",
        });
      } else {
        alert(data.error || "Failed to preview cleanup");
        setCleanupOpen(false);
      }
    } finally {
      setCleanupLoading(false);
    }
  };

  const runCleanup = async (mode: "mark" | "delete") => {
    if (!cleanupPreview?.total) return;
    if (
      mode === "delete" &&
      !confirm(
        `Permanently delete ${cleanupPreview.total} expired document(s) from DB and storage? This cannot be undone.`
      )
    ) {
      return;
    }
    setCleanupLoading(true);
    setBusy(true);
    try {
      const res = await apiFetch("/api/admin/documents/cleanup-expired", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, entityType: "all" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Cleanup failed");
        return;
      }
      alert(
        mode === "mark"
          ? `Marked ${data.marked || 0} document(s) as expired.`
          : `Deleted ${data.deleted || 0} document(s). Storage files removed: ${data.storageRemoved || 0}.`
      );
      setCleanupOpen(false);
      setSelectedIds([]);
      await fetchDocuments();
    } finally {
      setCleanupLoading(false);
      setBusy(false);
    }
  };

  const openReplace = (row: AdminDocumentRow) => {
    setReplaceRow(row);
    setUploadEntity(row.entity_type === "vehicle" ? "vehicle" : "driver");
    setUploadDocType(row.document_type);
    setUploadOwnerId(
      row.entity_type === "vehicle" ? row.vehicle_id : row.driver_id
    );
    setUploadFile(null);
    setUploadOpen(true);
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      alert("Choose a file first");
      return;
    }
    if (!replaceRow && !uploadOwnerId) {
      alert("Select a driver or vehicle");
      return;
    }
    setBusy(true);
    try {
      if (replaceRow) {
        const fd = new FormData();
        fd.append("file", uploadFile);
        fd.append("documentType", replaceRow.document_type);
        fd.append(
          "entityType",
          replaceRow.entity_type === "vehicle" ? "vehicle" : "driver"
        );
        fd.append("documentId", replaceRow.id);
        if (replaceRow.driver_id) fd.append("driverId", replaceRow.driver_id);
        if (replaceRow.vehicle_id) fd.append("vehicleId", replaceRow.vehicle_id);
        const res = await fetch("/api/admin/documents/upload", {
          method: "POST",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.error || "Replace failed");
          return;
        }
      } else {
        const fd = new FormData();
        fd.append("file", uploadFile);
        fd.append("documentType", uploadDocType);
        fd.append("entityType", uploadEntity);
        if (uploadEntity === "driver") fd.append("driverId", uploadOwnerId!);
        else fd.append("vehicleId", uploadOwnerId!);
        const res = await fetch("/api/admin/documents/upload", {
          method: "POST",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.error || "Upload failed");
          return;
        }
      }
      setUploadOpen(false);
      setUploadFile(null);
      setReplaceRow(null);
      await fetchDocuments();
    } finally {
      setBusy(false);
    }
  };

  const handleSaveExpiry = async () => {
    if (!expiryRow) return;
    setBusy(true);
    try {
      const path =
        expiryRow.entity_type === "vehicle"
          ? `/api/admin/drivers/documents/vehicle/${expiryRow.id}/expiry`
          : `/api/admin/drivers/documents/driver/${expiryRow.id}/expiry`;
      const res = await apiFetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiry_date: expiryDate.trim() ? expiryDate.trim() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to update expiry");
        return;
      }
      setExpiryRow(null);
      await fetchDocuments();
    } finally {
      setBusy(false);
    }
  };

  const columns = createDocumentsColumns({
    selectedIds,
    allVisibleSelected,
    onToggle: toggle,
    onToggleAll: toggleAll,
    onView: (row) => {
      if (row.file_url) window.open(row.file_url, "_blank");
      else alert("No file URL");
    },
    onReplace: openReplace,
    onEditExpiry: (row) => {
      setExpiryRow(row);
      setExpiryDate(row.expiry_date ? row.expiry_date.slice(0, 10) : "");
    },
    onDelete: handleDelete,
  });

  const ownerOptions =
    uploadEntity === "driver" ? driverOptions : vehicleOptions;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Documents"
        subtitle="Approve, upload, replace and delete driver & vehicle documents"
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void openCleanup()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Cleanup expired
            </Button>
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={openNewUpload}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 pb-3 pt-3 sm:px-4 md:px-6">
        {selectedIds.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="text-sm font-medium">
              {selectedIds.length} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() => void runBulk("approve")}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => void handleBulkDelete()}
              >
                Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        <DataTableShell
          fillHeight
          columns={columns}
          rows={rows}
          totalRows={total}
          isLoading={loading}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search driver, plate, document…"
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          emptyIcon={FileText}
          emptyTitle="No documents"
          emptyDescription="No documents match these filters."
          filters={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>

      {/* Reject */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Required"
            />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => setRejectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={busy || !rejectReason.trim()}
              onClick={() => void runBulk("reject", rejectReason.trim())}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload / Replace */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {replaceRow
                ? `Replace · ${documentTypeLabel(replaceRow.document_type)}`
                : "Upload document"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!replaceRow && (
              <>
                <div className="space-y-1">
                  <Label>Entity</Label>
                  <Select
                    value={uploadEntity}
                    onValueChange={(v) => {
                      setUploadEntity(v as "driver" | "vehicle");
                      setUploadOwnerId(null);
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>
                    {uploadEntity === "driver" ? "Driver" : "Vehicle"}
                  </Label>
                  <EntitySearchPicker
                    options={ownerOptions}
                    value={uploadOwnerId}
                    onChange={setUploadOwnerId}
                    loading={pickersLoading}
                    placeholder={
                      uploadEntity === "driver"
                        ? "Search driver by name or email…"
                        : "Search vehicle by plate…"
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Document type</Label>
                  <Select value={uploadDocType} onValueChange={setUploadDocType}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {documentTypeLabel(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {replaceRow && (
              <p className="text-sm text-muted-foreground">
                Old file is removed from storage; same document row gets the new
                file and status returns to pending.
              </p>
            )}
            <FileDropzone
              file={uploadFile}
              onFileChange={setUploadFile}
              disabled={busy}
            />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => setUploadOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void handleUploadSubmit()}
            >
              {replaceRow ? "Replace file" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cleanup expired */}
      <Dialog open={cleanupOpen} onOpenChange={setCleanupOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cleanup expired documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {cleanupLoading && !cleanupPreview ? (
              <p className="text-muted-foreground">Scanning org documents…</p>
            ) : cleanupPreview ? (
              <>
                <p>
                  Documents with expiry before{" "}
                  <span className="font-medium tabular-nums">
                    {cleanupPreview.cutoff}
                  </span>
                  :
                </p>
                <ul className="list-inside list-disc text-muted-foreground">
                  <li>
                    Driver docs:{" "}
                    <span className="font-medium text-foreground">
                      {cleanupPreview.driver}
                    </span>
                  </li>
                  <li>
                    Vehicle docs:{" "}
                    <span className="font-medium text-foreground">
                      {cleanupPreview.vehicle}
                    </span>
                  </li>
                  <li>
                    Total:{" "}
                    <span className="font-medium text-foreground">
                      {cleanupPreview.total}
                    </span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  <strong>Mark expired</strong> keeps rows (filterable as
                  expired). <strong>Delete permanently</strong> removes DB rows
                  and storage files — use when replaced docs should not stay.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No preview available.</p>
            )}
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:flex-wrap">
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => setCleanupOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              disabled={
                cleanupLoading || busy || !cleanupPreview || cleanupPreview.total === 0
              }
              onClick={() => void runCleanup("mark")}
            >
              Mark expired
            </Button>
            <Button
              className="w-full sm:w-auto"
              variant="destructive"
              disabled={
                cleanupLoading || busy || !cleanupPreview || cleanupPreview.total === 0
              }
              onClick={() => void runCleanup("delete")}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expiry */}
      <Dialog
        open={!!expiryRow}
        onOpenChange={(open) => !open && setExpiryRow(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit expiry date</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="expiry-date">Expiry (YYYY-MM-DD)</Label>
            <Input
              id="expiry-date"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Clear the date to remove expiry. Use Replace when the document
              file itself must change.
            </p>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => setExpiryRow(null)}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void handleSaveExpiry()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
