"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useCommunicationsHelpRealtime,
  useHelpTyping,
  type DriverOption,
  type HelpMessageRow,
  type HelpSessionRow,
} from "@/lib/features/communications";
import {
  ArrowLeft,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DriverSearchSelect } from "./driver-search-select";

type ListPayload = {
  rows: HelpSessionRow[];
  page: number;
  pageSize: number;
  total: number;
  summary: { total: number; active: number; closed: number };
};

export function CommunicationsHelpPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [data, setData] = useState<ListPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [session, setSession] = useState<HelpSessionRow | null>(null);
  const [messages, setMessages] = useState<HelpMessageRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [composeDriverId, setComposeDriverId] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const { driverTyping, notifyTyping, stopTyping } = useHelpTyping(selectedId);
  const openingRef = useRef(false);
  const statusRef = useRef(status);
  const searchRef = useRef(searchValue);
  const pageRef = useRef(page);

  selectedIdRef.current = selectedId;
  statusRef.current = status;
  searchRef.current = searchValue;
  pageRef.current = page;

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  async function loadList(opts?: {
    status?: string;
    q?: string;
    page?: number;
    silent?: boolean;
  }) {
    if (!opts?.silent) setLoading(true);
    try {
      const nextStatus = opts?.status ?? statusRef.current;
      const nextQ = opts?.q ?? searchRef.current;
      const nextPage = opts?.page ?? pageRef.current;
      const params = new URLSearchParams({
        status: nextStatus,
        page: String(nextPage),
        pageSize: String(pageSize),
      });
      if (nextQ.trim()) params.set("q", nextQ.trim());

      const res = await fetch(`/api/admin/communications/help?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
      // Auto-open first thread only on first interactive load — not on silent realtime refresh
      if (!opts?.silent && !selectedIdRef.current && json.rows?.[0]?.id) {
        void openSession(json.rows[0].id, { markRead: true });
      }
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

  async function openSession(
    sessionId: string,
    opts?: { markRead?: boolean; silent?: boolean }
  ) {
    if (openingRef.current && opts?.silent) return;
    openingRef.current = true;
    selectedIdRef.current = sessionId;
    setSelectedId(sessionId);
    if (!opts?.silent) setDetailLoading(true);
    try {
      const qs = opts?.markRead ? "?markRead=1" : "";
      const res = await fetch(`/api/admin/communications/help/${sessionId}${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load chat");
      setSession(json.session);
      setMessages(json.messages || []);
      if (opts?.markRead) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                rows: prev.rows.map((r) =>
                  r.id === sessionId ? { ...r, unread_count: 0 } : r
                ),
              }
            : prev
        );
        // Sync bell + nav badge with Messages (industry: open = read)
        window.dispatchEvent(new CustomEvent("admin-messages-refresh"));
        window.dispatchEvent(new CustomEvent("admin-messages-read"));
      }
      if (!opts?.silent) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch (err) {
      if (!opts?.silent) {
        toast({
          title: "Chat load failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      }
    } finally {
      openingRef.current = false;
      if (!opts?.silent) setDetailLoading(false);
    }
  }

  function clearPendingImage() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingImage(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onPickImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Only images allowed", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image too large (max 10MB)", variant: "destructive" });
      return;
    }
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingImage(file);
    setPendingPreview(URL.createObjectURL(file));
  }

  async function sendReply() {
    if (!selectedId || (!reply.trim() && !pendingImage)) return;
    setSending(true);
    try {
      const form = new FormData();
      if (reply.trim()) form.set("message", reply.trim());
      if (pendingImage) form.set("file", pendingImage);

      const res = await fetch(`/api/admin/communications/help/${selectedId}`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed");
      stopTyping();
      setMessages((prev) => [...prev, json.message as HelpMessageRow]);
      setReply("");
      clearPendingImage();
      await loadList({ silent: true });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      toast({
        title: "Reply failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) void sendReply();
    }
  }

  function senderLabel(m: HelpMessageRow): string {
    if (m.sender_display_name?.trim()) return m.sender_display_name.trim();
    if (m.sender_type === "driver") return session?.driver_name || "Driver";
    return "Support";
  }

  async function loadDrivers() {
    try {
      const res = await fetch("/api/admin/communications/drivers");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load drivers");
      const list = ((json.drivers || []) as DriverOption[]).filter(
        (d) => d.is_active !== false
      );
      setDrivers(list);
    } catch (err) {
      toast({
        title: "Drivers load failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function openCompose() {
    setComposeOpen(true);
    setComposeMessage("");
    if (drivers.length === 0) await loadDrivers();
  }

  async function sendCompose() {
    if (!composeDriverId || !composeMessage.trim()) return;
    setComposeSending(true);
    try {
      const res = await fetch("/api/admin/communications/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: composeDriverId,
          message: composeMessage.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed");

      setComposeOpen(false);
      setComposeMessage("");
      setComposeDriverId("");
      toast({
        title: "Message sent",
        description: json.notified
          ? "Driver notified"
          : json.notifySkipped === "debounce"
            ? "Sent — push skipped (recent notify on this thread)"
            : "Sent to chat",
      });

      setStatus("all");
      statusRef.current = "all";
      setPage(1);
      pageRef.current = 1;
      await loadList({ status: "all", page: 1 });
      if (json.sessionId) {
        await openSession(json.sessionId as string, { markRead: true });
      }
    } catch (err) {
      toast({
        title: "Send failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setComposeSending(false);
    }
  }

  async function setSessionStatus(next: "active" | "closed") {
    if (!selectedId) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/admin/communications/help/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");

      setSession((prev) =>
        prev
          ? {
              ...prev,
              status: json.session.status,
              closed_at: json.session.closed_at,
              updated_at: json.session.updated_at,
            }
          : prev
      );

      // Keep closed threads visible
      if (statusRef.current === "active" && next === "closed") {
        setStatus("all");
        statusRef.current = "all";
      }

      setData((prev) =>
        prev
          ? {
              ...prev,
              rows: prev.rows.map((r) =>
                r.id === selectedId
                  ? {
                      ...r,
                      status: json.session.status,
                      closed_at: json.session.closed_at,
                      updated_at: json.session.updated_at,
                    }
                  : r
              ),
            }
          : prev
      );

      toast({
        title: next === "closed" ? "Conversation closed" : "Conversation reopened",
        description:
          next === "closed"
            ? "Stays in the list as closed. Driver can start a new chat for a new topic."
            : "Thread is open again for replies.",
      });

      await loadList({ status: statusRef.current, silent: true });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setClosing(false);
    }
  }

  useEffect(() => {
    void loadList({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      pageRef.current = 1;
      void loadList({ q: searchValue, page: 1 });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  useCommunicationsHelpRealtime(
    selectedId,
    () => {
      void loadList({ silent: true });
    },
    () => {
      const id = selectedIdRef.current;
      if (id) void openSession(id, { silent: true, markRead: false });
    }
  );

  // Pulse/realtime bridge from topbar alerts — refresh inbox without full page reload
  useEffect(() => {
    const onRefresh = () => {
      void loadList({ silent: true });
      const id = selectedIdRef.current;
      if (id) void openSession(id, { silent: true, markRead: false });
    };
    window.addEventListener("admin-messages-refresh", onRefresh);
    return () => window.removeEventListener("admin-messages-refresh", onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 [&>div]:px-4 [&>div]:py-3 md:[&>div]:px-6 md:[&>div]:py-4">
        <PageHeader
          title="Messages"
          subtitle="Close keeps history · new driver chat = new conversation"
          actions={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-9"
                onClick={() => void openCompose()}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New message
              </Button>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v);
                  statusRef.current = v;
                  setPage(1);
                  pageRef.current = 1;
                  void loadList({ status: v, page: 1 });
                }}
              >
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  void loadList();
                  if (selectedId) void openSession(selectedId, { markRead: false });
                }}
                disabled={loading}
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          }
        />
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
        <section
          className={cn(
            "min-h-0 flex-col border-border bg-card lg:border-r",
            selectedId ? "hidden lg:flex" : "flex"
          )}
        >
          <div className="shrink-0 space-y-2 border-b border-border bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{data?.summary.active ?? 0} open</span>
              <span>·</span>
              <span>{data?.summary.closed ?? 0} closed</span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 pl-8 text-xs"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search driver, topic, message…"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            )}
            {!loading && (data?.rows || []).length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No conversations
              </div>
            )}
            {(data?.rows || []).map((row) => {
              const active = row.id === selectedId;
              const unread = Number(row.unread_count) || 0;
              const isClosed = row.status === "closed";
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => void openSession(row.id, { markRead: true })}
                  className={`w-full border-b border-border px-3 py-2.5 text-left transition-colors ${
                    active ? "bg-muted/60" : "hover:bg-muted/30"
                  } ${isClosed ? "opacity-80" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {row.driver_name || "Driver"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {row.topic || "Driver support"}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {unread > 0 && (
                        <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                          {unread}
                        </span>
                      )}
                      <Badge
                        variant={isClosed ? "secondary" : "default"}
                        className="px-1.5 py-0 text-[10px]"
                      >
                        {isClosed ? "closed" : "open"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {row.last_sender_type === "driver" ? "Driver: " : ""}
                    {row.last_message_preview || "—"}
                  </div>
                </button>
              );
            })}
          </div>

          {(data?.total ?? 0) > 0 && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
              <span>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data?.total ?? 0)} /{" "}
                {data?.total ?? 0}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={page <= 1}
                  onClick={() => {
                    const p = page - 1;
                    setPage(p);
                    pageRef.current = p;
                    void loadList({ page: p });
                  }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span>
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
                    pageRef.current = p;
                    void loadList({ page: p });
                  }}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </section>

        <section
          className={cn(
            "min-h-0 flex-col bg-card",
            selectedId ? "flex" : "hidden lg:flex"
          )}
        >
          {!selectedId && (
            <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Select a conversation
            </div>
          )}
          {selectedId && (
            <>
              <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-border px-3 py-2.5">
                <div className="flex min-w-0 items-start gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 gap-1 px-2 lg:hidden"
                    onClick={() => setSelectedId(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Inbox
                  </Button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {session?.driver_name || "Driver"}
                      </span>
                      <Badge
                        variant={session?.status === "closed" ? "secondary" : "default"}
                        className="text-[10px]"
                      >
                        {session?.status === "closed" ? "closed" : "open"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session?.topic || "Driver support"}
                      {session?.driver_email ? ` · ${session.driver_email}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session?.status === "closed" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={closing}
                      onClick={() => void setSessionStatus("active")}
                    >
                      <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                      Reopen
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={closing}
                      onClick={() => void setSessionStatus("closed")}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Close
                    </Button>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3 py-3">
                {detailLoading && (
                  <div className="text-sm text-muted-foreground">Loading messages…</div>
                )}
                {!detailLoading &&
                  messages.map((m) => {
                    const fromDriver = m.sender_type === "driver";
                    const caption =
                      m.message_type === "image" &&
                      (m.message === "📷 Photo" || !m.message.trim())
                        ? null
                        : m.message;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${fromDriver ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm sm:max-w-[75%] ${
                            fromDriver
                              ? "bg-muted text-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <div className="mb-0.5 text-[11px] font-medium opacity-80">
                            {senderLabel(m)}
                          </div>
                          {m.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <a href={m.image_url} target="_blank" rel="noreferrer">
                              <img
                                src={m.image_url}
                                alt="attachment"
                                className="mb-1 max-h-52 rounded object-cover"
                              />
                            </a>
                          ) : null}
                          {caption ? (
                            <div className="whitespace-pre-wrap">{caption}</div>
                          ) : null}
                          <div className="mt-0.5 text-[10px] opacity-70">
                            {new Date(m.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                <div ref={bottomRef} />
                {driverTyping && (
                  <div className="px-1 pt-1 text-xs italic text-muted-foreground">
                    {session?.driver_name || "Driver"} is typing…
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {session?.status === "closed" ? (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>Conversation closed — stays in history.</div>
                    <div className="text-xs">
                      Driver: closed chat goes to History. Opening Support again starts a{" "}
                      <span className="font-medium text-foreground">new</span> conversation
                      (new topic), without mixing into this one. Reopen here only if you want
                      to continue <span className="font-medium text-foreground">this</span>{" "}
                      thread.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingPreview && (
                      <div className="relative inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pendingPreview}
                          alt="Pending"
                          className="h-20 rounded border border-border object-cover"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                          onClick={clearPendingImage}
                          aria-label="Remove image"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          onPickImage(e.target.files?.[0] || null)
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0 self-end"
                        disabled={sending}
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Attach photo"
                      >
                        <ImagePlus className="h-4 w-4" />
                      </Button>
                      <Textarea
                        value={reply}
                        onChange={(e) => {
                          setReply(e.target.value);
                          if (e.target.value.trim()) notifyTyping();
                          else stopTyping();
                        }}
                        onBlur={() => stopTyping()}
                        onKeyDown={onComposerKeyDown}
                        placeholder="Reply… (Enter to send · Shift+Enter new line)"
                        rows={2}
                        className="min-h-[56px] text-sm"
                      />
                      <Button
                        onClick={() => void sendReply()}
                        disabled={sending || (!reply.trim() && !pendingImage)}
                        className="self-end"
                        size="sm"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-title"
            className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="compose-title" className="text-sm font-semibold">
                New message to driver
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setComposeOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Driver
                </label>
                <DriverSearchSelect
                  drivers={drivers}
                  value={composeDriverId}
                  onChange={setComposeDriverId}
                  placeholder="Search active driver…"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Message
                </label>
                <Textarea
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  placeholder="Write your message…"
                  rows={4}
                  className="text-sm"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Opens or reuses their support chat. Driver gets a push (debounced
                if you already notified this thread in the last 3 minutes).
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setComposeOpen(false)}
                  disabled={composeSending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    composeSending ||
                    !composeDriverId ||
                    !composeMessage.trim()
                  }
                  onClick={() => void sendCompose()}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {composeSending ? "Sending…" : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
