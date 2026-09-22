/**
 * Hook pentru gestionarea perioadei selectate în dashboard
 */

import { useState, useCallback, useMemo } from "react";
import {
  Period,
  PeriodPreset,
  DateRange,
  getEffectiveDateRange,
  formatPeriodLabel,
  formatPeriodSubtitle,
  dateRangeToURLParams,
} from "@/lib/utils/date-periods";

export interface UseDashboardPeriodReturn {
  period: Period;
  setPeriod: (period: Period) => void;
  setPreset: (preset: PeriodPreset) => void;
  setCustomRange: (range: DateRange) => void;
  effectiveRange: DateRange | null;
  label: string;
  subtitle: string;
  urlParams: Record<string, string>;
}

/**
 * Hook pentru gestionarea stării perioadei selectate
 */
export function useDashboardPeriod(
  defaultPreset: PeriodPreset = "last30days"
): UseDashboardPeriodReturn {
  const [period, setPeriod] = useState<Period>({
    preset: defaultPreset,
  });

  const setPreset = useCallback((preset: PeriodPreset) => {
    setPeriod({ preset });
  }, []);

  const setCustomRange = useCallback((range: DateRange) => {
    setPeriod({
      preset: "custom",
      customRange: range,
    });
  }, []);

  const effectiveRange = useMemo(() => {
    return getEffectiveDateRange(period);
  }, [period]);

  const label = useMemo(() => {
    return formatPeriodLabel(period);
  }, [period]);

  const subtitle = useMemo(() => {
    return formatPeriodSubtitle(period);
  }, [period]);

  const urlParams = useMemo(() => {
    return {
      period: period.preset,
      ...dateRangeToURLParams(effectiveRange),
    };
  }, [period.preset, effectiveRange]);

  return {
    period,
    setPeriod,
    setPreset,
    setCustomRange,
    effectiveRange,
    label,
    subtitle,
    urlParams,
  };
}
