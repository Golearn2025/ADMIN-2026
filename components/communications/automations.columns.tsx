"use client";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataTableColumn } from "@/components/table/data-table";
import type {
  AutomationRule,
  DocExpiryCandidate,
} from "@/lib/features/communications";

export function getAutomationRuleColumns(opts: {
  savingId: string | null;
  onToggle: (rule: AutomationRule, enabled: boolean) => void;
}): DataTableColumn<AutomationRule>[] {
  return [
    {
      key: "enabled",
      header: "Enabled",
      width: "100px",
      cell: (row) => (
        <Checkbox
          checked={row.enabled}
          disabled={opts.savingId === row.id}
          onCheckedChange={(checked) =>
            opts.onToggle(row, checked === true)
          }
          aria-label={`Toggle ${row.title}`}
        />
      ),
    },
    {
      key: "rule",
      header: "Rule",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.title}</div>
          {row.description ? (
            <div className="mt-0.5 text-xs text-muted-foreground">
              {row.description}
            </div>
          ) : null}
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {row.rule_key}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      width: "120px",
      cell: (row) => <Badge variant="outline">{row.category}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      cell: (row) => (
        <Badge variant={row.enabled ? "default" : "secondary"}>
          {row.enabled ? "ON" : "OFF"}
        </Badge>
      ),
    },
    {
      key: "config",
      header: "Config",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {JSON.stringify(row.config)}
        </span>
      ),
    },
  ];
}

export function getDocExpiryColumns(): DataTableColumn<DocExpiryCandidate>[] {
  return [
    {
      key: "driver",
      header: "Driver",
      cell: (row) => (
        <div>
          <div>{row.driver_name || "—"}</div>
          <div className="text-xs text-muted-foreground">
            {row.driver_email || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "document",
      header: "Document",
      cell: (row) => row.document_type,
    },
    {
      key: "entity",
      header: "Entity",
      cell: (row) => (
        <span>
          {row.entity_type}
          {row.license_plate ? ` · ${row.license_plate}` : ""}
        </span>
      ),
    },
    {
      key: "expiry",
      header: "Expiry",
      cell: (row) => row.expiry_date,
    },
    {
      key: "days",
      header: "Days left",
      width: "110px",
      cell: (row) => (
        <Badge
          variant={row.days_until_expiry <= 7 ? "destructive" : "secondary"}
        >
          {row.days_until_expiry}d
        </Badge>
      ),
    },
  ];
}
