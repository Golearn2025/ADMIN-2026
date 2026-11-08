"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common";
import { DataTableShell } from "@/components/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  WISE_BATCH_DOCS,
  formatGbp,
  formatLondonDate,
  type DriverPayoutJob,
  type DriverPayoutWeekly,
} from "@/lib/features/driver-payouts";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  RefreshCw,
  Send,
  Wallet,
} from "lucide-react";
import {
  getDriverPayoutColumns,
  statusBadge,
  type DriverPayoutWeeklyRow,
} from "./driver-payouts.columns";

type ApiPayload = {
  weekly: DriverPayoutWeekly[];
  jobs: DriverPayoutJob[];
  weekOptions: string[];
  summary: {
    drivers: number;
    jobs: number;
    clientPaidPence: number;
    driverOwedPence: number;
    unpaidJobs: number;
    missingBankDrivers: number;
  };
};

type SortKey =
  | "week_desc"
  | "week_asc"
  | "driver_asc"
  | "driver_desc"
  | "owed_desc"
  | "owed_asc"
  | "status";

function rowKey(row: DriverPayoutWeekly) {
  return `${row.driver_id}:${row.week_key}`;
}

function sortWeekly(
  rows: DriverPayoutWeekly[],
  sortKey: SortKey
): DriverPayoutWeekly[] {
  const next = [...rows];
  next.sort((a, b) => {
    switch (sortKey) {
      case "week_asc":
        return a.week_key.localeCompare(b.week_key);
      case "week_desc":
        return b.week_key.localeCompare(a.week_key);
      case "driver_asc":
        return a.driver_name.localeCompare(b.driver_name);
      case "driver_desc":
        return b.driver_name.localeCompare(a.driver_name);
      case "owed_asc":
        return a.driver_owed_pence - b.driver_owed_pence;
      case "owed_desc":
        return b.driver_owed_pence - a.driver_owed_pence;
      case "status":
        return a.week_payout_status.localeCompare(b.week_payout_status);
      default:
        return 0;
    }
  });
  return next;
}

export function DriverPayoutsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [weekKey, setWeekKey] = useState<string>("all");
  const [data, setData] = useState<ApiPayload | null>(null);
  const [selectedLegs, setSelectedLegs] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("week_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [wiseStatus, setWiseStatus] = useState<{
    ok: boolean;
    env?: string;
    profileName?: string | null;
    error?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs =
        weekKey !== "all" ? `?weekKey=${encodeURIComponent(weekKey)}` : "";
      const res = await fetch(`/api/admin/driver-payouts${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (err) {
      toast({
        title: "Could not load driver payouts",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [weekKey, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/driver-payouts/wise-status");
        const json = await res.json();
        if (!cancelled) setWiseStatus(json);
      } catch {
        if (!cancelled) setWiseStatus({ ok: false, error: "Wise status unreachable" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [weekKey, searchValue, sortKey]);

  const jobsByDriverWeek = useMemo(() => {
    const map = new Map<string, DriverPayoutJob[]>();
    for (const job of data?.jobs || []) {
      const key = `${job.driver_id}:${job.week_key}`;
      const list = map.get(key) || [];
      list.push(job);
      map.set(key, list);
    }
    return map;
  }, [data?.jobs]);

  const filteredSorted = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    const filtered = (data?.weekly || []).filter((row) => {
      if (!q) return true;
      const hay = `${row.driver_name} ${row.account_holder_name || ""} ${row.week_key} ${row.week_payout_status}`.toLowerCase();
      return hay.includes(q);
    });
    return sortWeekly(filtered, sortKey);
  }, [data?.weekly, searchValue, sortKey]);

  const totalRows = filteredSorted.length;

  const pagedRows: DriverPayoutWeeklyRow[] = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize).map((row, i) => ({
      ...row,
      nrCrt: start + i + 1,
    }));
  }, [filteredSorted, page, pageSize]);

  const legsForRow = useCallback(
    (row: DriverPayoutWeekly) =>
      (jobsByDriverWeek.get(rowKey(row)) || []).map((j) => j.booking_leg_id),
    [jobsByDriverWeek]
  );

  const toggleLeg = (legId: string) => {
    setSelectedLegs((prev) => {
      const next = new Set(prev);
      if (next.has(legId)) next.delete(legId);
      else next.add(legId);
      return next;
    });
  };

  const isRowSelected = (row: DriverPayoutWeekly) => {
    const legs = legsForRow(row);
    return legs.length > 0 && legs.every((id) => selectedLegs.has(id));
  };

  const isRowIndeterminate = (row: DriverPayoutWeekly) => {
    const legs = legsForRow(row);
    const n = legs.filter((id) => selectedLegs.has(id)).length;
    return n > 0 && n < legs.length;
  };

  const toggleRow = (row: DriverPayoutWeekly) => {
    const legs = legsForRow(row);
    setSelectedLegs((prev) => {
      const next = new Set(prev);
      const allOn = legs.length > 0 && legs.every((id) => next.has(id));
      for (const id of legs) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const pageLegIds = useMemo(
    () => pagedRows.flatMap((row) => legsForRow(row)),
    [pagedRows, legsForRow]
  );

  const allPageSelected =
    pageLegIds.length > 0 && pageLegIds.every((id) => selectedLegs.has(id));
  const somePageSelected = pageLegIds.some((id) => selectedLegs.has(id));

  const togglePage = () => {
    setSelectedLegs((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const id of pageLegIds) next.delete(id);
      } else {
        for (const id of pageLegIds) next.add(id);
      }
      return next;
    });
  };

  const markSelected = async (status: "paid" | "unpaid" | "skipped") => {
    if (!selectedLegs.size) {
      toast({ title: "Select at least one job", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/driver-payouts/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingLegIds: Array.from(selectedLegs),
          status,
          paymentReference: status === "paid" ? `MANUAL-${Date.now()}` : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Mark failed");
      toast({
        title: `Marked ${json.updated} job(s) as ${status}`,
      });
      setSelectedLegs(new Set());
      await load();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const exportWise = async (row?: DriverPayoutWeekly) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/driver-payouts/export-wise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekKey: row?.week_key || (weekKey !== "all" ? weekKey : undefined),
          driverId: row?.driver_id,
          bookingLegIds:
            !row && selectedLegs.size ? Array.from(selectedLegs) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Export failed");

      const blob = new Blob([json.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = json.filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Wise CSV ready",
        description: `${json.drivers} driver(s) · ${formatGbp(
          Math.round(json.totalGbp * 100)
        )} · batch ${json.batchId}`,
      });
      setSelectedLegs(new Set());
      await load();
    } catch (err) {
      toast({
        title: "Wise export failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const payWiseApi = async (row?: DriverPayoutWeekly) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/driver-payouts/pay-wise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekKey: row?.week_key || (weekKey !== "all" ? weekKey : undefined),
          driverId: row?.driver_id,
          bookingLegIds:
            !row && selectedLegs.size ? Array.from(selectedLegs) : undefined,
          attemptFund: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Pay with Wise failed");

      const feePence = Math.round((json.totalWiseFeeGbp || 0) * 100);
      toast({
        title: json.funded ? "Wise batch funded" : "Wise batch drafted",
        description: `${json.drivers} driver(s) · receive ${formatGbp(
          Math.round((json.totalGbp || 0) * 100)
        )} · quote fee ${formatGbp(feePence)}${
          json.funded
            ? ""
            : " · UK token: fund batch in Wise portal (docs: API cannot fund)"
        }`,
      });
      if (!json.funded && json.portalUrl) {
        window.open(json.portalUrl, "_blank", "noopener,noreferrer");
      }
      setSelectedLegs(new Set());
      await load();
    } catch (err) {
      toast({
        title: "Pay with Wise failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo(
    () =>
      getDriverPayoutColumns({
        onExportWise: exportWise,
        actionLoading,
        isRowSelected,
        isRowIndeterminate,
        onToggleRow: toggleRow,
        allPageSelected,
        somePageSelected,
        onTogglePage: togglePage,
      }),
    // handlers close over latest selection/export; keep deps on selection state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actionLoading, selectedLegs, allPageSelected, somePageSelected, pagedRows]
  );

  return (
    <div>
      <PageHeader
        title="Driver Payouts"
        subtitle="Weekly settlements from completed jobs — client paid vs driver owed (SSOT views). Wise CSV + API."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading || actionLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                actionLoading ||
                (!selectedLegs.size && weekKey === "all")
              }
              onClick={() => exportWise()}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Wise CSV
              {selectedLegs.size > 0 ? ` (${selectedLegs.size})` : ""}
            </Button>
            <Button
              size="sm"
              disabled={
                actionLoading ||
                (!selectedLegs.size && weekKey === "all") ||
                wiseStatus?.ok === false
              }
              onClick={() => payWiseApi()}
            >
              <Send className="mr-2 h-4 w-4" />
              Pay with Wise
              {selectedLegs.size > 0 ? ` (${selectedLegs.size})` : ""}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!selectedLegs.size || actionLoading}
              onClick={() => markSelected("paid")}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark paid ({selectedLegs.size || 0})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!selectedLegs.size || actionLoading}
              onClick={() => setSelectedLegs(new Set())}
            >
              Clear selection
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 md:p-8">
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-2 flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Wise batch payments
          </p>
          <p className="mb-3">
            <strong>Pay with Wise</strong> creates a sandbox/live batch via API (one transfer per driver). Sandbox may fund from balance; UK live often needs you to open Wise and fund the batch, then Mark paid if needed. CSV export remains as backup. Jobs must be unpaid/ready and have UK bank details.
          </p>
          <p className="mb-3">
            API status:{" "}
            {wiseStatus == null
              ? "checking…"
              : wiseStatus.ok
                ? `connected (${wiseStatus.env}${wiseStatus.profileName ? ` · ${wiseStatus.profileName}` : ""})`
                : `not connected — ${wiseStatus.error || "check WISE_API_TOKEN"}`}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              className="inline-flex items-center gap-1 text-primary hover:underline"
              href={WISE_BATCH_DOCS.helpCentre}
              target="_blank"
              rel="noreferrer"
            >
              Wise batch guide <ExternalLink className="h-3 w-3" />
            </a>
            <a
              className="inline-flex items-center gap-1 text-primary hover:underline"
              href={WISE_BATCH_DOCS.apiBatchTransfers}
              target="_blank"
              rel="noreferrer"
            >
              Wise API batch transfers <ExternalLink className="h-3 w-3" />
            </a>
            <a
              className="inline-flex items-center gap-1 text-primary hover:underline"
              href={WISE_BATCH_DOCS.recipients}
              target="_blank"
              rel="noreferrer"
            >
              UK recipient (sort code) <ExternalLink className="h-3 w-3" />
            </a>
            <a
              className="inline-flex items-center gap-1 text-primary hover:underline"
              href={WISE_BATCH_DOCS.businessPayouts}
              target="_blank"
              rel="noreferrer"
            >
              Wise Business payouts <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {data?.summary && (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <Stat label="Drivers" value={String(data.summary.drivers)} />
            <Stat label="Jobs" value={String(data.summary.jobs)} />
            <Stat
              label="Client paid"
              value={formatGbp(data.summary.clientPaidPence)}
            />
            <Stat
              label="Driver owed"
              value={formatGbp(data.summary.driverOwedPence)}
            />
            <Stat label="Unpaid jobs" value={String(data.summary.unpaidJobs)} />
            <Stat
              label="No bank details"
              value={String(data.summary.missingBankDrivers)}
            />
          </div>
        )}

        {selectedLegs.size > 0 && (
          <p className="text-sm text-muted-foreground">
            {selectedLegs.size} job(s) selected
          </p>
        )}

        <DataTableShell
          columns={columns}
          rows={pagedRows}
          totalRows={totalRows}
          isLoading={loading}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search driver, account holder, week, status…"
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          emptyIcon={Wallet}
          emptyTitle="No driver payouts found"
          emptyDescription="No completed driver jobs match this week or search."
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <Select value={weekKey} onValueChange={setWeekKey}>
                <SelectTrigger className="w-48 h-9">
                  <SelectValue placeholder="Week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All weeks</SelectItem>
                  {(data?.weekOptions || []).map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sortKey}
                onValueChange={(v) => setSortKey(v as SortKey)}
              >
                <SelectTrigger className="w-52 h-9">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week_desc">Week ↓</SelectItem>
                  <SelectItem value="week_asc">Week ↑</SelectItem>
                  <SelectItem value="driver_asc">Driver A–Z</SelectItem>
                  <SelectItem value="driver_desc">Driver Z–A</SelectItem>
                  <SelectItem value="owed_desc">Owed ↓</SelectItem>
                  <SelectItem value="owed_asc">Owed ↑</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          getRowCanExpand={() => true}
          renderExpandedRow={(row) => {
            const jobs = jobsByDriverWeek.get(rowKey(row)) || [];
            return (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="p-2 w-10" />
                    <th className="p-2 text-left">Booking</th>
                    <th className="p-2 text-left">Settled</th>
                    <th className="p-2 text-right">Client</th>
                    <th className="p-2 text-right">Driver</th>
                    <th className="p-2 text-center">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.booking_leg_id}
                      className="border-t border-border/60"
                    >
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedLegs.has(job.booking_leg_id)}
                          onChange={() => toggleLeg(job.booking_leg_id)}
                        />
                      </td>
                      <td className="p-2 font-medium">
                        {job.booking_reference}
                      </td>
                      <td className="p-2">
                        {formatLondonDate(job.settlement_date_london)}
                      </td>
                      <td className="p-2 text-right">
                        {formatGbp(job.client_paid_pence)}
                        {!job.client_paid && (
                          <span className="ml-1 text-destructive">unpaid</span>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {formatGbp(job.driver_owed_pence)}
                      </td>
                      <td className="p-2 text-center">
                        {statusBadge(job.payout_status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
