"use client";

import { DataTableColumn } from "@/components/table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Car, Eye, Trash2, Upload, User } from "lucide-react";

export type AdminDocumentRow = {
  id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  entity_type: string;
  document_type: string;
  status: string;
  file_url: string | null;
  expiry_date: string | null;
  created_at: string;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_email?: string | null;
  vehicle_license?: string | null;
  vehicle_plate?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: number | null;
};

const DOC_LABELS: Record<string, string> = {
  pco_licence: "PCO Licence",
  drivers_licence: "Driver's Licence",
  proof_of_identity: "Proof of Identity",
  proof_of_address: "Proof of Address",
  bank_statement: "Bank Statement",
  insurance: "Insurance",
  mot: "MOT Certificate",
  vehicle_registration: "Vehicle Registration",
  logbook: "Logbook",
  profile_photo: "Profile Photo",
  exterior_front: "Exterior Front",
  exterior_rear: "Exterior Rear",
  interior_front: "Interior Front",
  interior_rear: "Interior Rear",
  hire_agreement: "Hire Agreement",
  phv_licence: "PHV Licence",
  mot_certificate: "MOT Certificate",
  v5c_logbook: "V5C Logbook",
  insurance_certificate: "Insurance Certificate",
  vehicle_photo_exterior_front: "Exterior Front Photo",
  vehicle_photo_exterior_rear: "Exterior Rear Photo",
  vehicle_photo_interior_front: "Interior Front Photo",
  vehicle_photo_interior_rear: "Interior Rear Photo",
};

export function documentTypeLabel(type: string) {
  return (
    DOC_LABELS[type] ||
    type
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function createDocumentsColumns(opts: {
  selectedIds: string[];
  allVisibleSelected: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onView: (row: AdminDocumentRow) => void;
  onReplace: (row: AdminDocumentRow) => void;
  onEditExpiry: (row: AdminDocumentRow) => void;
  onDelete: (row: AdminDocumentRow) => void;
}): DataTableColumn<AdminDocumentRow>[] {
  return [
    {
      key: "select",
      header: (
        <Checkbox
          checked={opts.allVisibleSelected}
          onCheckedChange={() => opts.onToggleAll()}
          aria-label="Select all"
        />
      ),
      width: "44px",
      className: "w-11 !px-2",
      cell: (row) => (
        <Checkbox
          checked={opts.selectedIds.includes(row.id)}
          onCheckedChange={() => opts.onToggle(row.id)}
          aria-label="Select row"
        />
      ),
    },
    {
      key: "contact",
      header: "Contact",
      width: "22%",
      className: "!pl-2 !pr-3",
      cell: (row) => {
        const name = row.driver_name || "Unknown driver";
        const phone = row.driver_phone || null;
        const email = row.driver_email || null;
        return (
          <div className="flex min-w-0 items-start gap-2">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {phone || "—"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {email || "—"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "vehicle",
      header: "Vehicle",
      width: "18%",
      cell: (row) => {
        const plate = row.vehicle_plate || null;
        const model = row.vehicle_model || null;
        const year = row.vehicle_year != null ? String(row.vehicle_year) : null;
        if (!plate && !model) {
          return (
            <span className="text-sm text-muted-foreground">—</span>
          );
        }
        return (
          <div className="flex min-w-0 items-start gap-2">
            <Car className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-medium">
                {plate || "—"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {[model, year].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "type",
      header: "Document",
      width: "16%",
      cell: (row) => (
        <span className="text-sm">{documentTypeLabel(row.document_type)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "10%",
      cell: (row) => (
        <Badge
          variant={
            row.status === "approved"
              ? "default"
              : row.status === "rejected" || row.status === "expired"
                ? "destructive"
                : "secondary"
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "expiry",
      header: "Expiry",
      width: "10%",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.expiry_date
            ? new Date(row.expiry_date).toLocaleDateString("en-GB")
            : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "140px",
      className: "!px-2",
      cell: (row) => (
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => opts.onView(row)}
            aria-label="View"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => opts.onReplace(row)}
            aria-label="Replace"
            title="Replace file"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => opts.onEditExpiry(row)}
            aria-label="Edit expiry"
            title="Edit expiry"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            onClick={() => opts.onDelete(row)}
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
