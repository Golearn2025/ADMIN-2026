"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DispatchSettings = {
  wavesEnabledManual: boolean;
  wavesEnabledAutomatic: boolean;
  defaultManualMode: "open" | "direct" | "waves";
  directWaitMinutes: number;
  premiumWaitMinutes: number;
  directToPremiumManual: boolean;
};

type PremiumDriver = {
  id: string;
  name: string;
  phone: string | null;
  status: string | null;
};

type SearchDriver = {
  id: string;
  name: string;
  phone: string;
  status: string;
};

const defaultSettings: DispatchSettings = {
  wavesEnabledManual: true,
  wavesEnabledAutomatic: false,
  defaultManualMode: "open",
  directWaitMinutes: 10,
  premiumWaitMinutes: 10,
  directToPremiumManual: true,
};

export default function DispatchPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<DispatchSettings>(defaultSettings);
  const [premiumDrivers, setPremiumDrivers] = useState<PremiumDriver[]>([]);
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchDriver[]>([]);
  const [searching, setSearching] = useState(false);

  const premiumIds = useMemo(
    () => new Set(premiumDrivers.map((d) => d.id)),
    [premiumDrivers]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dispatch/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load settings");
      setSettings({ ...defaultSettings, ...data.settings });
      setPremiumDrivers(data.premiumDrivers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/admin/bookings/assignable-drivers?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d) => setSearchResults(d.data || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function saveSettings() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/dispatch/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSettings({ ...defaultSettings, ...data.settings });
      setMessage("Settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function addPremium(driverId: string) {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/dispatch/premium-drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to add driver");
      return;
    }
    setPremiumDrivers((prev) => {
      if (prev.some((d) => d.id === data.driver.id)) return prev;
      return [...prev, data.driver];
    });
    setMessage(`${data.driver.name} added to premium`);
    setQ("");
    setSearchResults([]);
  }

  async function removePremium(driverId: string) {
    setError(null);
    setMessage(null);
    const res = await fetch(
      `/api/admin/dispatch/premium-drivers?driverId=${encodeURIComponent(driverId)}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to remove driver");
      return;
    }
    setPremiumDrivers((prev) => prev.filter((d) => d.id !== driverId));
    setMessage("Removed from premium list");
  }

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Job Dispatch"
        subtitle="Direct → Release to Premium (manual from Bookings) → Open after Premium timer. Add premium drivers below. Site bookings stay Open until automatic waves are enabled."
      />

      <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700">
                {message}
              </p>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Wave settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={settings.wavesEnabledManual}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        wavesEnabledManual: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    <span className="font-medium">Enable waves on New Job (manual)</span>
                    <span className="block text-xs text-muted-foreground">
                      Allows Direct / Premium cascade when creating jobs in admin.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={settings.wavesEnabledAutomatic}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        wavesEnabledAutomatic: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    <span className="font-medium">Enable waves on website bookings</span>
                    <span className="block text-xs text-muted-foreground">
                      Keep OFF for now — site stays Open to category/model as today.
                    </span>
                  </span>
                </label>

                <div className="space-y-1.5">
                  <Label>Default mode for New Job</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={settings.defaultManualMode}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        defaultManualMode: e.target.value as DispatchSettings["defaultManualMode"],
                      }))
                    }
                  >
                    <option value="open">Open (all matching drivers)</option>
                    <option value="direct">Direct (pick one driver)</option>
                    <option value="waves">Waves (Direct → Premium → Open)</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Direct wait (minutes)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={240}
                      value={settings.directWaitMinutes}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          directWaitMinutes: Number(e.target.value || 10),
                        }))
                      }
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Guidance / reminder while job is locked on the chosen driver.
                      Escalation to Premium stays manual.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Premium → Open (minutes)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={240}
                      value={settings.premiumWaitMinutes}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          premiumWaitMinutes: Number(e.target.value || 10),
                        }))
                      }
                    />
                    <p className="text-[11px] text-muted-foreground">
                      After release to Premium, auto-open to all matching drivers.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={settings.directToPremiumManual}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        directToPremiumManual: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    <span className="font-medium">Direct → Premium requires admin button</span>
                    <span className="block text-xs text-muted-foreground">
                      Recommended ON (your decision): you release manually to premium list.
                    </span>
                  </span>
                </label>

                <Button onClick={() => void saveSettings()} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-4 w-4 text-amber-500" />
                  Premium drivers list
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Manual list — not from rating. Only these drivers see Wave 2.
                </p>

                <div className="space-y-1.5">
                  <Label>Add approved driver</Label>
                  <Input
                    placeholder="Search name or phone…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  {(searching || searchResults.length > 0) && (
                    <div className="max-h-44 overflow-y-auto rounded-md border divide-y">
                      {searching && (
                        <p className="p-3 text-xs text-muted-foreground">Searching…</p>
                      )}
                      {!searching &&
                        searchResults.map((d) => {
                          const already = premiumIds.has(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              disabled={already}
                              onClick={() => void addPremium(d.id)}
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40 disabled:opacity-50"
                            >
                              <span>
                                <span className="font-medium">{d.name}</span>
                                {d.phone && (
                                  <span className="block text-xs text-muted-foreground">
                                    {d.phone}
                                  </span>
                                )}
                              </span>
                              {already ? (
                                <span className="text-xs text-muted-foreground">Added</span>
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                {premiumDrivers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No premium drivers yet. Add at least one before Wave 2 can work.
                  </p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {premiumDrivers.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                      >
                        <div>
                          <p className="font-medium">{d.name}</p>
                          {d.phone && (
                            <p className="text-xs text-muted-foreground">{d.phone}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void removePremium(d.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
