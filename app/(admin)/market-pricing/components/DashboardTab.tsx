"use client";

import { useEffect, useState } from "react";
import {
  TrendingDown, TrendingUp, Minus, BarChart3, Calendar, Building2, Route,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MarketCheck, MarketCompetitor, MarketRouteTemplate } from "@/lib/market-pricing/types";
import { formatGbp } from "@/lib/market-pricing/format";
import { computeStats, computePosition, POSITION_CONFIG } from "@/lib/market-pricing/formulas";

interface StatCard {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
}

export function DashboardTab() {
  const [checks, setChecks] = useState<MarketCheck[]>([]);
  const [competitors, setCompetitors] = useState<MarketCompetitor[]>([]);
  const [routes, setRoutes] = useState<MarketRouteTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [c, comp, r] = await Promise.all([
        fetch("/api/admin/market-pricing/checks?limit=5").then(r => r.json()),
        fetch("/api/admin/market-pricing/competitors").then(r => r.json()),
        fetch("/api/admin/market-pricing/routes").then(r => r.json()),
      ]);
      setChecks(c.checks ?? []);
      setCompetitors(comp.competitors ?? []);
      setRoutes(r.routes ?? []);
      setLoading(false);
    })();
  }, []);

  const latestCheck = checks[0];
  const activeRoutes = routes.filter(r => r.is_active);
  const activeCompetitors = competitors.filter(c => c.is_active);
  const totalScenarios = activeRoutes.reduce((s, r) => s + (r.scenarios?.length ?? 0), 0);

  const stats: StatCard[] = [
    {
      label: "Tracked competitors",
      value: activeCompetitors.length.toString(),
      sub: competitors.filter(c => c.runs_google_ads).length + " running Google Ads",
      icon: <Building2 className="h-5 w-5" />,
      color: "text-blue-400",
    },
    {
      label: "Route templates",
      value: activeRoutes.length.toString(),
      sub: totalScenarios + " scenario" + (totalScenarios !== 1 ? "s" : ""),
      icon: <Route className="h-5 w-5" />,
      color: "text-purple-400",
    },
    {
      label: "Weekly checks",
      value: checks.length.toString(),
      sub: latestCheck ? "Last: " + new Date(latestCheck.quote_datetime).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "None yet",
      icon: <Calendar className="h-5 w-5" />,
      color: "text-amber-400",
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Overview</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Market intelligence at a glance</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-card animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <div className={`${s.color} mb-3`}>{s.icon}</div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{s.label}</p>
              {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Recent checks */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Recent checks</h3>
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-card animate-pulse" />)}</div>
        ) : checks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No checks yet — go to <strong>Weekly Checks</strong> to start your first one.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {checks.slice(0, 5).map(c => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5"
              >
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground flex-1 truncate">
                  {c.label ?? new Date(c.quote_datetime).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(c.quote_datetime).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Competitors overview */}
      {!loading && competitors.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Competitors</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {competitors.filter(c => c.is_active).map(c => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.website_url}</p>
                </div>
                {c.runs_google_ads && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-400 shrink-0 ml-auto">
                    Ads
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Getting started */}
      {!loading && (checks.length === 0 || routes.length === 0 || competitors.length === 0) && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Getting started</h3>
          <ol className="space-y-2">
            {competitors.length === 0 && (
              <li className="flex gap-2 text-sm text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">1</span>
                Go to <strong className="text-foreground">Competitors</strong> and add your tracked competitors (or seed defaults).
              </li>
            )}
            {routes.length === 0 && (
              <li className="flex gap-2 text-sm text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">2</span>
                Go to <strong className="text-foreground">Routes</strong> and create your route templates.
              </li>
            )}
            {checks.length === 0 && (
              <li className="flex gap-2 text-sm text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">3</span>
                Go to <strong className="text-foreground">Weekly Checks</strong> and start your first price check.
              </li>
            )}
          </ol>
        </div>
      )}
    </div>
  );
}
