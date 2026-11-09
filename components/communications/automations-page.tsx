"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type {
  AutomationRule,
  DocExpiryCandidate,
} from "@/lib/features/communications";
import { RefreshCw, Zap } from "lucide-react";

type Payload = {
  rules: AutomationRule[];
  docExpiryCandidates: DocExpiryCandidate[];
};

export function CommunicationsAutomationsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/communications/automations");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (err) {
      toast({
        title: "Load failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleRule(rule: AutomationRule, enabled: boolean) {
    setSavingId(rule.id);
    try {
      const res = await fetch("/api/admin/communications/automations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, enabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      setData((prev) =>
        prev
          ? {
              ...prev,
              rules: prev.rules.map((r) =>
                r.id === rule.id ? (json.rule as AutomationRule) : r
              ),
            }
          : prev
      );
      toast({
        title: enabled ? "Automation enabled" : "Automation disabled",
        description: rule.title,
      });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        subtitle="Toggle reminder rules. Candidates come from SSOT views."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="space-y-8 px-8 pb-10">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Rules</h2>
          </div>

          <div className="overflow-hidden border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Enabled</th>
                  <th className="px-4 py-3 font-medium">Rule</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Config</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading &&
                  (data?.rules || []).map((rule) => (
                    <tr key={rule.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={rule.enabled}
                          disabled={savingId === rule.id}
                          onCheckedChange={(checked) =>
                            void toggleRule(rule, checked === true)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{rule.title}</div>
                        {rule.description ? (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {rule.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{rule.category}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {JSON.stringify(rule.config)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">
            Doc expiry candidates (next 30 days)
          </h2>
          <p className="text-xs text-muted-foreground">
            From `admin_doc_expiry_candidates_v1` — preview for the documents automation.
          </p>

          <div className="overflow-hidden border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Expiry</th>
                  <th className="px-4 py-3 font-medium">Days left</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && (data?.docExpiryCandidates || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No approved docs expiring in the next 30 days
                    </td>
                  </tr>
                )}
                {!loading &&
                  (data?.docExpiryCandidates || []).map((row) => (
                    <tr
                      key={`${row.document_id}-${row.entity_type}`}
                      className="border-t border-border"
                    >
                      <td className="px-4 py-3">
                        <div>{row.driver_name}</div>
                        <div className="text-xs text-muted-foreground">{row.driver_email}</div>
                      </td>
                      <td className="px-4 py-3">{row.document_type}</td>
                      <td className="px-4 py-3">
                        {row.entity_type}
                        {row.license_plate ? ` · ${row.license_plate}` : ""}
                      </td>
                      <td className="px-4 py-3">{row.expiry_date}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            row.days_until_expiry <= 7 ? "destructive" : "secondary"
                          }
                        >
                          {row.days_until_expiry}d
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
