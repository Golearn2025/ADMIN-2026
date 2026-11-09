"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  DOCUMENTS_TYPE_OPTIONS,
  INBOX_SECTIONS,
  UPDATES_TYPE_OPTIONS,
  sectionForInboxType,
  useCommunicationsNotificationsRealtime,
  type CommunicationsSendHistoryRow,
  type DocumentInboxType,
  type DriverOption,
  type InboxNotificationType,
  type InboxSection,
  type UpdatesInboxType,
} from "@/lib/features/communications";
import { DriverSearchSelect } from "./driver-search-select";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";

type FeedPayload = {
  rows: CommunicationsSendHistoryRow[];
  page: number;
  pageSize: number;
  total: number;
  summary: { total: number; updates: number; documents: number };
};

function statusBadge(status: string) {
  const variant =
    status === "delivered"
      ? "default"
      : status === "pending" || status === "ready" || status === "processing"
        ? "secondary"
        : status.includes("fail") || status === "dead_letter"
          ? "destructive"
          : "outline";
  return (
    <Badge variant={variant} className="px-1.5 py-0 text-[10px] font-normal">
      {status}
    </Badge>
  );
}

function formatWhen(value: string) {
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CommunicationsNotificationsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [composeOpen, setComposeOpen] = useState(true);
  const [tab, setTab] = useState<"all" | InboxSection>("all");
  const [feed, setFeed] = useState<FeedPayload | null>(null);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<CommunicationsSendHistoryRow | null>(
    null
  );

  const [section, setSection] = useState<InboxSection>("updates");
  const [inboxType, setInboxType] = useState<InboxNotificationType>("admin_message");
  const [audience, setAudience] = useState<"one" | "all">("one");
  const [driverId, setDriverId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const typeOptions =
    section === "documents" ? DOCUMENTS_TYPE_OPTIONS : UPDATES_TYPE_OPTIONS;

  const destinationHint =
    section === "documents"
      ? "Driver app → Notifications → Documents"
      : "Driver app → Notifications → Updates";

  const totalPages = Math.max(1, Math.ceil((feed?.total ?? 0) / pageSize));

  async function loadDrivers() {
    const driversRes = await fetch("/api/admin/communications/drivers");
    const driversJson = await driversRes.json();
    if (!driversRes.ok) throw new Error(driversJson.error || "Failed to load drivers");
    setDrivers(driversJson.drivers || []);
    if (!driverId && driversJson.drivers?.[0]?.id) {
      setDriverId(driversJson.drivers[0].id);
    }
  }

  async function loadFeed(opts?: {
    tab?: "all" | InboxSection;
    q?: string;
    page?: number;
    pageSize?: number;
    silent?: boolean;
  }) {
    if (!opts?.silent) setLoading(true);
    try {
      const nextTab = opts?.tab ?? tab;
      const nextQ = opts?.q ?? searchValue;
      const nextPage = opts?.page ?? page;
      const nextPageSize = opts?.pageSize ?? pageSize;
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(nextPageSize),
      });
      if (nextTab !== "all") params.set("section", nextTab);
      if (nextQ.trim()) params.set("q", nextQ.trim());

      const feedRes = await fetch(
        `/api/admin/communications/notifications?${params.toString()}`
      );
      const feedJson = await feedRes.json();
      if (!feedRes.ok) throw new Error(feedJson.error || "Failed to load feed");
      setFeed(feedJson);
    } catch (err) {
      if (!opts?.silent) {
        toast({
          title: "Load failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useCommunicationsNotificationsRealtime(() => {
    void loadFeed({ silent: true });
  });

  useEffect(() => {
    void (async () => {
      try {
        await loadDrivers();
      } catch (err) {
        toast({
          title: "Load failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      }
      await loadFeed({ page: 1 });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      void loadFeed({ q: searchValue, page: 1 });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  function onSectionChange(next: InboxSection) {
    setSection(next);
    const first =
      next === "documents"
        ? (DOCUMENTS_TYPE_OPTIONS[0].id as DocumentInboxType)
        : (UPDATES_TYPE_OPTIONS[0].id as UpdatesInboxType);
    setInboxType(first);
  }

  async function onSend() {
    if (!title.trim() || !body.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and message are required",
        variant: "destructive",
      });
      return;
    }
    if (audience === "one" && !driverId) {
      toast({
        title: "Select a driver",
        description: "Choose who should receive this notification",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/communications/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: inboxType,
          title: title.trim(),
          body: body.trim(),
          audience,
          driverId: audience === "one" ? driverId : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed");

      toast({
        title: "Sent to driver inbox",
        description: `${json.sent} driver(s) · ${destinationHint}`,
      });
      setTitle("");
      setBody("");
      setPage(1);
      await loadFeed({ page: 1 });
    } catch (err) {
      toast({
        title: "Send failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-0 space-y-0">
      <div className="[&>div]:px-4 [&>div]:py-4 md:[&>div]:px-8 md:[&>div]:py-5">
        <PageHeader
          title="Notifications"
          subtitle="History + send · All / Updates / Documents"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadFeed()}
              disabled={loading}
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />
      </div>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-8 pt-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-5 lg:px-8">
        {/* Compose */}
        <section className="border border-border bg-card lg:sticky lg:top-4 lg:self-start">
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2.5 text-left lg:cursor-default"
            onClick={() => setComposeOpen((v) => !v)}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              Send
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform lg:hidden ${
                composeOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`space-y-3 border-t border-border px-3 pb-3 pt-3 ${
              composeOpen ? "block" : "hidden lg:block"
            }`}
          >
            <div className="space-y-1.5">
              <Label className="text-xs">Driver tab</Label>
              <Select
                value={section}
                onValueChange={(v) => onSectionChange(v as InboxSection)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INBOX_SECTIONS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select
                value={inboxType}
                onValueChange={(v) => setInboxType(v as InboxNotificationType)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Appears in <span className="font-medium text-foreground">{destinationHint}</span>
                <span className="mt-0.5 block font-mono opacity-80">
                  {inboxType} · {sectionForInboxType(inboxType)}
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Audience</Label>
              <Select
                value={audience}
                onValueChange={(v) => setAudience(v as "one" | "all")}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one">One driver</SelectItem>
                  <SelectItem value="all">All active drivers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {audience === "one" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Driver</Label>
                <DriverSearchSelect
                  drivers={drivers}
                  value={driverId}
                  onChange={setDriverId}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                className="h-9"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short title"
                maxLength={80}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Notification body"
                rows={3}
                maxLength={500}
                className="min-h-[72px] text-sm"
              />
            </div>

            <Button
              className="h-9 w-full"
              size="sm"
              onClick={() => void onSend()}
              disabled={sending}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </section>

        {/* History */}
        <section className="min-w-0 space-y-3">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              const next = v as typeof tab;
              setTab(next);
              setPage(1);
              void loadFeed({ tab: next, page: 1 });
            }}
          >
            <TabsList className="h-auto w-full justify-start gap-4 overflow-x-auto">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All ({feed?.summary.total ?? 0})
              </TabsTrigger>
              <TabsTrigger value="updates" className="text-xs sm:text-sm">
                Updates ({feed?.summary.updates ?? 0})
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs sm:text-sm">
                Documents ({feed?.summary.documents ?? 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8 text-sm"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search driver, title, type…"
            />
          </div>

          <div className="overflow-hidden border border-border bg-card">
            {loading && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            )}

            {!loading && (feed?.rows || []).length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No notifications match this filter
              </div>
            )}

            <ul className="divide-y divide-border">
              {!loading &&
                (feed?.rows || []).map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(row)}
                      className="flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-medium leading-tight">
                            {row.title}
                          </span>
                          {statusBadge(row.status)}
                          <Badge
                            variant="outline"
                            className="px-1.5 py-0 text-[10px] font-normal"
                          >
                            {row.section}
                          </Badge>
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {row.body || "—"}
                        </div>
                        {row.failure_reason ? (
                          <div className="mt-0.5 line-clamp-1 text-[11px] text-destructive">
                            {row.failure_reason}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-[11px] text-muted-foreground sm:text-right">
                        <div>{row.driver_name || "—"}</div>
                        <div className="font-mono opacity-80">{row.inbox_type}</div>
                        <div>{formatWhen(row.created_at)}</div>
                      </div>
                    </button>
                  </li>
                ))}
            </ul>

            {(feed?.total ?? 0) > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>
                    {(page - 1) * pageSize + 1}–
                    {Math.min(page * pageSize, feed?.total ?? 0)} of {feed?.total ?? 0}
                  </span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      const size = Number(v);
                      setPageSize(size);
                      setPage(1);
                      void loadFeed({ page: 1, pageSize: size });
                    }}
                  >
                    <SelectTrigger className="h-7 w-[72px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 30, 50].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}/page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    disabled={page <= 1}
                    onClick={() => {
                      const p = page - 1;
                      setPage(p);
                      void loadFeed({ page: p });
                    }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-1">
                    {page}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    disabled={page >= totalPages}
                    onClick={() => {
                      const p = page + 1;
                      setPage(p);
                      void loadFeed({ page: p });
                    }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-6 text-base leading-snug">
              {selected?.title || "Notification"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-1.5">
                {statusBadge(selected.status)}
                <Badge variant="outline" className="text-[10px]">
                  {selected.section}
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {selected.inbox_type}
                </Badge>
              </div>
              <div className="grid gap-1 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Driver: </span>
                  {selected.driver_name || "—"}
                  {selected.driver_email ? ` · ${selected.driver_email}` : ""}
                </div>
                <div>
                  <span className="font-medium text-foreground">When: </span>
                  {new Date(selected.created_at).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium text-foreground">Event: </span>
                  <span className="font-mono">{selected.event_type}</span>
                </div>
              </div>
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  Full message
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selected.body || "—"}
                </p>
              </div>
              {selected.failure_reason ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  {selected.failure_reason}
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
