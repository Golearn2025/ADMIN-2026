/**
 * Utilități pentru gestionarea perioadelor de timp în dashboard
 */

export type PeriodPreset = 
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "last90days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "all"
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface Period {
  preset: PeriodPreset;
  customRange?: DateRange;
}

/**
 * Calculează range-ul de date pentru un preset dat
 */
export function getDateRangeFromPreset(preset: PeriodPreset): DateRange | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (preset) {
    case "today":
      return {
        from: today,
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
      
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        from: yesterday,
        to: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }
      
    case "last7days": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: now };
    }
      
    case "last30days": {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from, to: now };
    }
      
    case "last90days": {
      const from = new Date(today);
      from.setDate(from.getDate() - 89);
      return { from, to: now };
    }
      
    case "thisMonth":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: now,
      };
      
    case "lastMonth": {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return {
        from: firstDayLastMonth,
        to: lastDayLastMonth,
      };
    }
      
    case "thisYear":
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: now,
      };
      
    case "all":
      return null; // null înseamnă fără filtru de dată
      
    case "custom":
      return null; // va fi setat manual
      
    default:
      return null;
  }
}

/**
 * Format period for display
 */
export function formatPeriodLabel(period: Period): string {
  const labels: Record<PeriodPreset, string> = {
    today: "Today",
    yesterday: "Yesterday",
    last7days: "Last 7 days",
    last30days: "Last 30 days",
    last90days: "Last 90 days",
    thisMonth: "This month",
    lastMonth: "Last month",
    thisYear: "This year",
    all: "All time",
    custom: "Custom range",
  };
  
  if (period.preset === "custom" && period.customRange) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${fmt.format(period.customRange.from)} - ${fmt.format(period.customRange.to)}`;
  }
  
  return labels[period.preset];
}

/**
 * Format period for subtitle
 */
export function formatPeriodSubtitle(period: Period): string {
  const subtitles: Record<PeriodPreset, string> = {
    today: "Today's data",
    yesterday: "Yesterday's data",
    last7days: "Last 7 days",
    last30days: "Last 30 days",
    last90days: "Last 90 days",
    thisMonth: "This month",
    lastMonth: "Last month",
    thisYear: "This year",
    all: "All periods",
    custom: "Selected period",
  };
  
  return subtitles[period.preset];
}

/**
 * Obține range-ul efectiv de date pentru o perioadă
 */
export function getEffectiveDateRange(period: Period): DateRange | null {
  if (period.preset === "custom") {
    return period.customRange || null;
  }
  return getDateRangeFromPreset(period.preset);
}

/**
 * Convertește range-ul de date în parametri URL
 */
export function dateRangeToURLParams(range: DateRange | null): Record<string, string> {
  if (!range) {
    return {};
  }
  
  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };
}

/**
 * Parsează parametrii URL în range de date
 */
export function urlParamsToDateRange(searchParams: URLSearchParams): DateRange | null {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  
  if (!from || !to) {
    return null;
  }
  
  try {
    return {
      from: new Date(from),
      to: new Date(to),
    };
  } catch {
    return null;
  }
}
