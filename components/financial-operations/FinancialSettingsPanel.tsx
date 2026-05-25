"use client";

import { RefreshCw } from "lucide-react";
import { FinancialSettingsForm } from "./FinancialSettingsForm";
import { useOrganizationFinancialSettings } from "./use-organization-financial-settings";

export function FinancialSettingsPanel() {
  const { form, source, loading, saving, error, saved, load, save, patchField } =
    useOrganizationFinancialSettings();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
        Loading financial operations settings…
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {source === "defaults" && (
        <p className="text-xs text-amber-600 border border-amber-500/30 rounded-md px-3 py-2 bg-amber-500/5">
          Showing defaults — save to persist for this organization (requires{" "}
          <span className="font-mono">organization_financial_settings</span> table).
        </p>
      )}

      <FinancialSettingsForm
        form={form}
        saving={saving}
        error={error}
        saved={saved}
        onPatch={patchField}
        onSave={() => void save()}
        onReload={() => void load()}
      />
    </div>
  );
}
