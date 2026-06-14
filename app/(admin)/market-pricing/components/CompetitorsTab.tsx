"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, ExternalLink, Pencil, Plus, Trash2, X, Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { MarketCompetitor } from "@/lib/market-pricing/types";
import { toFullUrl, displayUrl } from "@/lib/market-pricing/format";

const PRELOADED: Array<Omit<MarketCompetitor, "id" | "organization_id" | "created_at" | "updated_at">> = [
  { name: "Blacklane", website_url: "blacklane.com", runs_google_ads: true, sort_order: 0, is_active: true },
  { name: "Addison Lee", website_url: "addisonlee.com", runs_google_ads: true, sort_order: 1, is_active: true },
  { name: "Tristar Worldwide", website_url: "tristarworldwide.com", runs_google_ads: false, sort_order: 2, is_active: true },
  { name: "Rolzo", website_url: "rolzo.com", runs_google_ads: true, sort_order: 3, is_active: true },
  { name: "CarSevice4U", website_url: "carservice4u.co.uk", runs_google_ads: false, sort_order: 4, is_active: true },
];

interface EditState {
  id: string | null; // null = new
  name: string;
  website_url: string;
  runs_google_ads: boolean;
}

function emptyEdit(): EditState {
  return { id: null, name: "", website_url: "", runs_google_ads: false };
}

export function CompetitorsTab() {
  const [competitors, setCompetitors] = useState<MarketCompetitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const prevEditNull = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/market-pricing/competitors");
    const json = await res.json();
    setCompetitors(json.competitors ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Focus name only when form first opens (null → non-null), not on every keystroke
  useEffect(() => {
    const isOpen = edit !== null;
    if (isOpen && prevEditNull.current) {
      setTimeout(() => nameRef.current?.focus(), 50);
    }
    prevEditNull.current = !isOpen;
  }, [edit !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!edit) return;
    if (!edit.name.trim() || !edit.website_url.trim()) {
      setError("Name and website URL are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const method = edit.id ? "PATCH" : "POST";
      const body = edit.id
        ? { id: edit.id, name: edit.name.trim(), website_url: edit.website_url.trim(), runs_google_ads: edit.runs_google_ads }
        : { name: edit.name.trim(), website_url: edit.website_url.trim(), runs_google_ads: edit.runs_google_ads };
      const res = await fetch("/api/admin/market-pricing/competitors", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to save"); return; }
      await load();
      setEdit(null);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this competitor? Their historical prices will remain but the competitor will be removed.")) return;
    await fetch(`/api/admin/market-pricing/competitors?id=${id}`, { method: "DELETE" });
    await load();
  }

  async function seedPreloaded() {
    for (const c of PRELOADED) {
      await fetch("/api/admin/market-pricing/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      }).catch(() => null);
    }
    await load();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") setEdit(null);
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Competitors</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{competitors.length} tracked · add or edit at any time</p>
        </div>
        <div className="flex gap-2">
          {competitors.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedPreloaded}>
              Seed defaults
            </Button>
          )}
          <Button size="sm" onClick={() => setEdit(emptyEdit())}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add competitor
          </Button>
        </div>
      </div>

      {/* Inline add/edit form */}
      {edit !== null && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">{edit.id ? "Edit competitor" : "New competitor"}</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-3">
            <Input
              ref={nameRef}
              placeholder="Name (e.g. Blacklane)"
              value={edit.name}
              onChange={e => setEdit(s => s && { ...s, name: e.target.value })}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Input
              placeholder="Website (e.g. blacklane.com)"
              value={edit.website_url}
              onChange={e => setEdit(s => s && { ...s, website_url: e.target.value })}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded"
                checked={edit.runs_google_ads}
                onChange={e => setEdit(s => s && { ...s, runs_google_ads: e.target.checked })}
              />
              Runs Google Ads
            </label>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEdit(null); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                <Check className="h-4 w-4 mr-1" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-card animate-pulse" />
          ))}
        </div>
      ) : competitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">No competitors yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Seed defaults" to add the top 5 chauffeur competitors, or add manually.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {competitors.map(c => (
            <div
              key={c.id}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-border/80 transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                  {c.runs_google_ads && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-400">
                      Google Ads
                    </Badge>
                  )}
                </div>
                <a
                  href={toFullUrl(c.website_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5"
                >
                  {displayUrl(c.website_url)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setEdit({ id: c.id, name: c.name, website_url: c.website_url, runs_google_ads: c.runs_google_ads })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => remove(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
