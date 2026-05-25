"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, Save } from "lucide-react";
import { OPERATIONAL_RESERVE_FIELDS } from "./constants";
import { PercentField, PoundsField } from "./FinancialSettingsField";
import type { FinancialOperationsForm } from "./types";

type FinancialSettingsFormProps = {
  form: FinancialOperationsForm;
  saving: boolean;
  error: string | null;
  saved: boolean;
  onPatch: <K extends keyof FinancialOperationsForm>(
    key: K,
    value: FinancialOperationsForm[K]
  ) => void;
  onSave: () => void;
  onReload: () => void;
};

export function FinancialSettingsForm({
  form,
  saving,
  error,
  saved,
  onPatch,
  onSave,
  onReload,
}: FinancialSettingsFormProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Stripe fees (estimate)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <PercentField
            id="processor_fee_percent"
            label="Stripe percentage fee"
            hint="e.g. 1.4 = 1.4% of transaction value"
            step={0.01}
            value={form.processor_fee_percent}
            onChange={(v) => onPatch("processor_fee_percent", v)}
          />
          <PoundsField
            id="processor_fixed_fee_pounds"
            label="Stripe fixed fee"
            hint="e.g. 0.20 = 20p per transaction"
            value={form.processor_fixed_fee_pounds}
            onChange={(v) => onPatch("processor_fixed_fee_pounds", v)}
          />
        </div>
      </section>

      <section className="space-y-4 pt-2 border-t border-border/60">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Operational reserve</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Internal buffer deducted in profitability estimates (by booking type).
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {OPERATIONAL_RESERVE_FIELDS.map((field) => (
            <PoundsField
              key={field.key}
              id={field.key}
              label={field.label}
              hint={field.hint}
              value={form[field.key]}
              onChange={(v) => onPatch(field.key, v)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4 pt-2 border-t border-border/60">
        <h2 className="text-sm font-semibold text-foreground">Margin guardrails</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <PercentField
            id="low_margin_warning_percent"
            label="Low margin warning"
            hint="Warn when estimated margin falls below this %"
            value={form.low_margin_warning_percent}
            onChange={(v) => onPatch("low_margin_warning_percent", v)}
          />
          <PoundsField
            id="minimum_profit_pounds"
            label="Minimum estimated profit"
            hint="Minimum retained profit threshold per quote (estimate)"
            value={form.minimum_profit_pounds}
            onChange={(v) => onPatch("minimum_profit_pounds", v)}
          />
        </div>
      </section>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && (
        <p className="text-xs text-emerald-600 font-medium">Settings saved for this organization.</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row pt-2">
        <Button size="sm" onClick={onSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1.5" />
          )}
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReload}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Reload
        </Button>
      </div>
    </div>
  );
}
