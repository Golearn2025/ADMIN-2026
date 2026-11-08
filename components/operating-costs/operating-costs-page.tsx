"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/common/page-header";
import { DataTableShell } from "@/components/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CADENCE_OPTIONS,
  CATEGORY_OPTIONS,
  formatMoney,
  formatPounds,
  type CatalogItem,
  type CostCadence,
  type OperatingCostRow,
  type OperatingCostSummary,
} from "@/lib/operating-costs/types";
import { buildUpcomingRenewals } from "@/lib/operating-costs/renewals";
import { getOperatingCostColumns } from "@/components/operating-costs/operating-costs.columns";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  CalendarDays,
  TrendingDown,
  Wallet,
  ListChecks,
  ClipboardPaste,
  Bell,
} from "lucide-react";
import { parseBulkExpenseLines } from "@/lib/operating-costs/parse-bulk-expenses";

const emptySummary: OperatingCostSummary = {
  organization_id: "",
  active_count: 0,
  one_time_count: 0,
  cash_spent_pence: 0,
  monthly_burn_pence: 0,
  daily_burn_pence: 0,
  yearly_burn_pence: 0,
  unpaid_pence: 0,
  unpaid_count: 0,
};

const sheetClass =
  "w-[calc(100%-1rem)] max-w-lg gap-3 p-4 sm:p-6 " +
  "bottom-3 top-auto translate-y-0 rounded-2xl " +
  "sm:bottom-auto sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg " +
  "max-h-[90dvh] overflow-y-auto";

type FormState = {
  catalogId: string;
  vendorName: string;
  category: string;
  description: string;
  amountPounds: string;
  cadence: CostCadence;
  amortizeMonths: string;
  startDate: string;
  invoiceRef: string;
  notes: string;
  isUsageBased: boolean;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function blankForm(prefill?: Partial<FormState>): FormState {
  return {
    catalogId: "",
    vendorName: "",
    category: "other",
    description: "",
    amountPounds: "",
    cadence: "monthly",
    amortizeMonths: "",
    startDate: todayIso(),
    invoiceRef: "",
    notes: "",
    isUsageBased: false,
    ...prefill,
  };
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-lg sm:text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
    </div>
  );
}

export function OperatingCostsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costs, setCosts] = useState<OperatingCostRow[]>([]);
  const [summary, setSummary] = useState<OperatingCostSummary>(emptySummary);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState<"all" | "missing" | "done">("missing");
  const [catalogQ, setCatalogQ] = useState("");
  const [ledgerQ, setLedgerQ] = useState("");
  const [ledgerCategory, setLedgerCategory] = useState("all");
  const [ledgerCadence, setLedgerCadence] = useState("all");
  const [ledgerStatus, setLedgerStatus] = useState<"all" | "active" | "ended">("active");
  const [ledgerPayment, setLedgerPayment] = useState<"all" | "paid" | "unpaid">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteSaving, setPasteSaving] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/operating-costs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCosts(data.costs || []);
      setSummary(data.summary || emptySummary);
      setCatalog(data.catalog || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncSupabase() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/admin/operating-costs/sync-supabase", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Sync failed");
      }
      const warn =
        Array.isArray(data.warnings) && data.warnings.length
          ? ` · ${data.warnings[0]}`
          : "";
      setSyncMsg(
        `Synced: ${data.created} created, ${data.updated} updated` +
          (data.invoicesAvailable
            ? ` · ${data.invoicesImported} invoices`
            : " · invoices API N/A (use CSV for history)") +
          warn
      );
      await load();
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function syncGoogleBilling() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/admin/operating-costs/sync-google-billing", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Google Billing sync failed");
      }
      if (data.pending) {
        setSyncMsg(data.message || "Google Billing export pending (no rows yet).");
      } else {
        const warn =
          Array.isArray(data.warnings) && data.warnings.length
            ? ` · ${data.warnings[0]}`
            : "";
        setSyncMsg(
          `Google Billing: ${data.created} created, ${data.updated} updated` +
            (data.months != null ? ` · ${data.months} month buckets` : "") +
            warn
        );
      }
      await load();
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Google Billing sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function syncGoogleAds() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/admin/operating-costs/sync-google-ads", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Google Ads sync failed");
      }
      const warn =
        Array.isArray(data.warnings) && data.warnings.length
          ? ` · ${data.warnings[0]}`
          : "";
      setSyncMsg(
        `Google Ads: ${data.created} created, ${data.updated} updated` +
          (data.months != null ? ` · ${data.months} months` : "") +
          warn
      );
      await load();
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Google Ads sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const filteredCatalog = useMemo(() => {
    return catalog.filter((c) => {
      if (catalogFilter === "missing" && c.entries_count > 0) return false;
      if (catalogFilter === "done" && c.entries_count === 0) return false;
      if (!catalogQ.trim()) return true;
      const hay = `${c.name} ${c.category} ${c.search_hint || ""}`.toLowerCase();
      return hay.includes(catalogQ.trim().toLowerCase());
    });
  }, [catalog, catalogFilter, catalogQ]);

  const filteredCosts = useMemo(() => {
    return costs.filter((row) => {
      if (ledgerStatus !== "all" && row.status !== ledgerStatus) return false;
      if (ledgerPayment !== "all" && row.payment_status !== ledgerPayment) return false;
      if (ledgerCategory !== "all" && row.category !== ledgerCategory) return false;
      if (ledgerCadence !== "all" && row.cadence !== ledgerCadence) return false;
      if (!ledgerQ.trim()) return true;
      const hay =
        `${row.vendor_name} ${row.description || ""} ${row.invoice_ref || ""} ${row.notes || ""}`.toLowerCase();
      return hay.includes(ledgerQ.trim().toLowerCase());
    });
  }, [costs, ledgerStatus, ledgerPayment, ledgerCategory, ledgerCadence, ledgerQ]);

  const ledgerCategories = useMemo(() => {
    const set = new Set(costs.map((c) => c.category).filter(Boolean));
    return Array.from(set).sort();
  }, [costs]);

  const upcomingRenewals = useMemo(
    () => buildUpcomingRenewals(costs, { withinDays: 90 }),
    [costs]
  );

  const pagedCosts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCosts.slice(start, start + pageSize);
  }, [filteredCosts, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [ledgerQ, ledgerCategory, ledgerCadence, ledgerStatus]);

  function openAdd(fromCatalog?: CatalogItem) {
    if (fromCatalog) {
      setForm(
        blankForm({
          catalogId: fromCatalog.catalog_id,
          vendorName: fromCatalog.name,
          category: fromCatalog.category,
          cadence: (fromCatalog.suggested_cadence as CostCadence) || "monthly",
          isUsageBased: fromCatalog.is_usage_based,
          amortizeMonths: fromCatalog.suggested_cadence === "multi_year" ? "60" : "",
        })
      );
      setCatalogOpen(false);
    } else {
      setForm(blankForm());
    }
    setFormError(null);
    setDialogOpen(true);
  }

  async function submit() {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/admin/operating-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogId: form.catalogId || null,
          vendorName: form.vendorName,
          category: form.category,
          description: form.description,
          amountPounds: Number(form.amountPounds),
          cadence: form.cadence,
          amortizeMonths: form.amortizeMonths || null,
          startDate: form.startDate,
          invoiceRef: form.invoiceRef,
          notes: form.notes,
          isUsageBased: form.isUsageBased,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setDialogOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeCost(row: OperatingCostRow) {
    if (!confirm("Remove this expense from the ledger?")) return;
    const res = await fetch(`/api/admin/operating-costs/${row.id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  async function toggleEnded(row: OperatingCostRow) {
    const next = row.status === "active" ? "ended" : "active";
    const res = await fetch(`/api/admin/operating-costs/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) await load();
  }

  async function togglePayment(row: OperatingCostRow) {
    const next = row.payment_status === "paid" ? "unpaid" : "paid";
    const res = await fetch(`/api/admin/operating-costs/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: next }),
    });
    if (res.ok) await load();
  }

  const columns = useMemo(
    () =>
      getOperatingCostColumns({
        onToggleStatus: (row) => void toggleEnded(row),
        onTogglePayment: (row) => void togglePayment(row),
        onDelete: (row) => void removeCost(row),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers use latest load via closures each render
    [costs]
  );

  const selectClass =
    "flex h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operating Costs"
        subtitle="Expense ledger — same table pattern as Bookings / Team."
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-10 sm:h-9"
              onClick={() => void syncSupabase()}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Sync Supabase
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-10 sm:h-9"
              onClick={() => void syncGoogleBilling()}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Sync Google Billing
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-10 sm:h-9"
              onClick={() => void syncGoogleAds()}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Sync Google Ads
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-10 sm:h-9"
              onClick={() => {
                setPasteText("");
                setPasteError(null);
                setPasteOpen(true);
              }}
            >
              <ClipboardPaste className="mr-1.5 h-4 w-4" />
              Paste invoices
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-10 sm:h-9"
              onClick={() => {
                setCatalogQ("");
                setCatalogFilter("missing");
                setCatalogOpen(true);
              }}
            >
              <ListChecks className="mr-1.5 h-4 w-4" />
              From catalog
            </Button>
            <Button size="sm" className="h-10 sm:h-9" onClick={() => openAdd()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add expense
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 space-y-6">
        {error && (
          <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            {error}
          </p>
        )}
        {syncMsg && (
          <p className="text-sm rounded-lg border border-border bg-secondary/30 px-3 py-2">
            {syncMsg}
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon={<TrendingDown className="h-4 w-4" />}
            label="Burn / month"
            value={loading ? "…" : formatPounds(summary.monthly_burn_pence)}
            hint="GBP · latest period · ECB FX"
          />
          <KpiCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Burn / day"
            value={loading ? "…" : formatPounds(summary.daily_burn_pence)}
            hint="Same active costs, in GBP"
          />
          <KpiCard
            icon={<Wallet className="h-4 w-4" />}
            label="Cash total"
            value={loading ? "…" : formatPounds(summary.cash_spent_pence)}
            hint="All invoices in GBP (ECB)"
          />
          <KpiCard
            icon={<Receipt className="h-4 w-4" />}
            label="Unpaid"
            value={
              loading
                ? "…"
                : `${summary.unpaid_count ?? 0} · ${formatPounds(summary.unpaid_pence ?? 0)}`
            }
            hint="Still to pay · GBP (ECB FX)"
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Upcoming renewals</p>
              <p className="text-[11px] text-muted-foreground">
                Next 90 days — monthly &amp; yearly (from last paid date + cadence)
              </p>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : upcomingRenewals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No renewals in the next 90 days. Set cadence to Monthly/Yearly on recurring
              costs (not One-time).
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {upcomingRenewals.map((r) => (
                <li
                  key={`${r.id}-${r.next_renewal_date}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-3 py-2.5 bg-background"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.vendor_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Last paid {r.last_paid_date}
                      {r.description ? ` · ${r.description}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm shrink-0">
                    <span className="text-[10px] uppercase tracking-wide rounded bg-secondary px-1.5 py-0.5 text-muted-foreground">
                      {r.cadence}
                    </span>
                    <span className="tabular-nums font-medium">
                      {formatMoney(r.amount_pence, r.currency)}
                    </span>
                    <span
                      className={
                        r.days_until <= 14
                          ? "tabular-nums text-amber-700 font-medium"
                          : "tabular-nums text-muted-foreground"
                      }
                    >
                      {r.next_renewal_date}
                      {r.days_until === 0
                        ? " · today"
                        : r.days_until === 1
                          ? " · tomorrow"
                          : ` · in ${r.days_until}d`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DataTableShell
          columns={columns}
          rows={pagedCosts}
          totalRows={filteredCosts.length}
          isLoading={loading}
          searchValue={ledgerQ}
          onSearchChange={setLedgerQ}
          searchPlaceholder="Search vendor, description, invoice ref…"
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          emptyIcon={Receipt}
          emptyTitle="No expenses found"
          emptyDescription="No expenses match your filters. Add from catalog or create a custom expense."
          emptyAction={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCatalogFilter("missing");
                  setCatalogOpen(true);
                }}
              >
                From catalog
              </Button>
              <Button onClick={() => openAdd()}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add expense
              </Button>
            </div>
          }
          getRowClassName={(row) => (row.status === "ended" ? "opacity-60" : undefined)}
          filters={
            <>
              <select
                className={selectClass}
                value={ledgerCategory}
                onChange={(e) => setLedgerCategory(e.target.value)}
              >
                <option value="all">All categories</option>
                {ledgerCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                value={ledgerCadence}
                onChange={(e) => setLedgerCadence(e.target.value)}
              >
                <option value="all">All cadences</option>
                {CADENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                value={ledgerStatus}
                onChange={(e) =>
                  setLedgerStatus(e.target.value as "all" | "active" | "ended")
                }
              >
                <option value="active">Active</option>
                <option value="ended">Ended</option>
                <option value="all">All status</option>
              </select>
              <select
                className={selectClass}
                value={ledgerPayment}
                onChange={(e) =>
                  setLedgerPayment(e.target.value as "all" | "paid" | "unpaid")
                }
              >
                <option value="all">All payments</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </>
          }
        />
      </div>

      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className={cn(sheetClass, "sm:max-w-xl")}>
          <DialogHeader>
            <DialogTitle>Add from catalog</DialogTitle>
            <DialogDescription>
              Pick a known vendor to prefill the expense form.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search vendor…"
              value={catalogQ}
              onChange={(e) => setCatalogQ(e.target.value)}
              className="h-11"
            />
            <div className="flex rounded-lg border border-border/60 overflow-hidden text-xs w-fit">
              {(["all", "missing", "done"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setCatalogFilter(f)}
                  className={cn(
                    "px-2.5 py-1.5 touch-manipulation",
                    catalogFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/40 text-muted-foreground"
                  )}
                >
                  {f === "all" ? "All" : f === "missing" ? "Missing" : "Logged"}
                </button>
              ))}
            </div>
            <div className="max-h-[50dvh] overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/40">
              {filteredCatalog.length === 0 && (
                <p className="text-sm text-muted-foreground p-4">Nothing matches.</p>
              )}
              {filteredCatalog.map((item) => {
                const done = item.entries_count > 0;
                return (
                  <button
                    key={item.catalog_id}
                    type="button"
                    onClick={() => openAdd(item)}
                    className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-muted/40 touch-manipulation"
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.name}</span>
                      <span className="block text-[11px] text-muted-foreground capitalize mt-0.5">
                        {item.category} · {item.suggested_cadence}
                        {item.search_hint ? ` · ${item.search_hint}` : ""}
                      </span>
                    </span>
                    {item.website_url && (
                      <a
                        href={item.website_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 text-muted-foreground hover:text-foreground p-1"
                        aria-label="Open billing"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatalogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={sheetClass}>
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
            <DialogDescription>
              One-time, monthly, yearly, or multi-year with amortization (e.g. TfL £2000 / 60
              months).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <Input
                className="h-11"
                value={form.vendorName}
                onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))}
                placeholder="e.g. Supabase / Business cards"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Amount (£)</Label>
                <Input
                  className="h-11"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.amountPounds}
                  onChange={(e) => setForm((f) => ({ ...f, amountPounds: e.target.value }))}
                  placeholder="50.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input
                  className="h-11"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Cadence</Label>
                <select
                  className="flex h-11 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm"
                  value={form.cadence}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cadence: e.target.value as CostCadence }))
                  }
                >
                  {CADENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  className="flex h-11 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(form.cadence === "multi_year" || form.cadence === "one_time") && (
              <div className="space-y-1.5">
                <Label>
                  Amortize months
                  {form.cadence === "multi_year" ? " (required)" : " (optional)"}
                </Label>
                <Input
                  className="h-11"
                  type="number"
                  min={1}
                  value={form.amortizeMonths}
                  onChange={(e) => setForm((f) => ({ ...f, amortizeMonths: e.target.value }))}
                  placeholder={form.cadence === "multi_year" ? "60 (= 5 years)" : "e.g. 12"}
                />
                <p className="text-[11px] text-muted-foreground">
                  Spread the amount across months for burn. One-time with no amortize = cash only,
                  £0 burn.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Invoice ref (optional)</Label>
              <Input
                className="h-11"
                value={form.invoiceRef}
                onChange={(e) => setForm((f) => ({ ...f, invoiceRef: e.target.value }))}
                placeholder="INV-123 / last4 card"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Context, link, etc."
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isUsageBased}
                onChange={(e) => setForm((f) => ({ ...f, isUsageBased: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              Usage-based (varies with consumption)
            </label>

            {formError && <p className="text-xs text-destructive">{formError}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={
                saving ||
                !form.vendorName.trim() ||
                !form.amountPounds ||
                Number(form.amountPounds) < 0
              }
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
