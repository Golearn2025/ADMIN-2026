"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/apiClient";
import { FINANCIAL_OPERATIONS_DEFAULTS } from "./constants";
import type { FinancialOperationsForm, FinancialSettingsSource } from "./types";

const API_PATH = "/api/admin/organization-financial-settings";

function mapApiToForm(data: Record<string, unknown>): FinancialOperationsForm {
  return {
    processor_fee_percent:
      Number(data.processor_fee_percent) || FINANCIAL_OPERATIONS_DEFAULTS.processor_fee_percent,
    processor_fixed_fee_pounds:
      Number(data.processor_fixed_fee_pounds) ??
      FINANCIAL_OPERATIONS_DEFAULTS.processor_fixed_fee_pounds,
    default_operational_reserve_pounds:
      Number(data.default_operational_reserve_pounds) ??
      FINANCIAL_OPERATIONS_DEFAULTS.default_operational_reserve_pounds,
    hourly_operational_reserve_pounds:
      Number(data.hourly_operational_reserve_pounds) ??
      FINANCIAL_OPERATIONS_DEFAULTS.hourly_operational_reserve_pounds,
    daily_operational_reserve_pounds:
      Number(data.daily_operational_reserve_pounds) ??
      FINANCIAL_OPERATIONS_DEFAULTS.daily_operational_reserve_pounds,
    fleet_operational_reserve_pounds:
      Number(data.fleet_operational_reserve_pounds) ??
      FINANCIAL_OPERATIONS_DEFAULTS.fleet_operational_reserve_pounds,
    low_margin_warning_percent:
      Number(data.low_margin_warning_percent) ??
      FINANCIAL_OPERATIONS_DEFAULTS.low_margin_warning_percent,
    minimum_profit_pounds:
      Number(data.minimum_profit_pounds) ?? FINANCIAL_OPERATIONS_DEFAULTS.minimum_profit_pounds,
  };
}

export function useOrganizationFinancialSettings() {
  const [form, setForm] = useState<FinancialOperationsForm>(FINANCIAL_OPERATIONS_DEFAULTS);
  const [source, setSource] = useState<FinancialSettingsSource>("defaults");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(API_PATH);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setForm(mapApiToForm(data));
      setSource((data.source as FinancialSettingsSource) ?? "defaults");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await apiFetch(API_PATH, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setForm(mapApiToForm(data));
      setSource((data.source as FinancialSettingsSource) ?? "organization_financial_settings");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [form]);

  const patchField = useCallback(
    <K extends keyof FinancialOperationsForm>(key: K, value: FinancialOperationsForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return {
    form,
    source,
    loading,
    saving,
    error,
    saved,
    load,
    save,
    patchField,
  };
}
