"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common";
import { DataTableShell } from "@/components/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type {
  AutomationRule,
  DocExpiryCandidate,
} from "@/lib/features/communications";
import { FileWarning, RefreshCw, Zap } from "lucide-react";
import {
  getAutomationRuleColumns,
  getDocExpiryColumns,
} from "./automations.columns";

export function CommunicationsAutomationsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [candidates, setCandidates] = useState<DocExpiryCandidate[]>([]);
  const [candidatesTotal, setCandidatesTotal] = useState(0);

  const [rulesSearch, setRulesSearch] = useState("");
  const debouncedRulesSearch = useDeferredValue(rulesSearch);
  const [rulesPage, setRulesPage] = useState(1);
  const [rulesPageSize, setRulesPageSize] = useState(20);

  const [candidatesSearch, setCandidatesSearch] = useState("");
  const debouncedCandidatesSearch = useDeferredValue(candidatesSearch);
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [candidatesPageSize, setCandidatesPageSize] = useState(20);

  async function load(opts?: { silent?: boolean }) {
    if (!opts?.silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(candidatesPage),
        pageSize: String(candidatesPageSize),
      });
      if (debouncedCandidatesSearch.trim()) {
        params.set("q", debouncedCandidatesSearch.trim());
      }

      const res = await fetch(
        `/api/admin/communications/automations?${params.toString()}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");

      setRules(json.rules || []);
      setCandidates(json.docExpiryCandidates || []);
      setCandidatesTotal(Number(json.candidatesTotal) || 0);
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

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatesPage, candidatesPageSize, debouncedCandidatesSearch]);

  useEffect(() => {
    setRulesPage(1);
  }, [debouncedRulesSearch]);

  useEffect(() => {
    setCandidatesPage(1);
  }, [debouncedCandidatesSearch]);

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
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? (json.rule as AutomationRule) : r))
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

  const ruleColumns = useMemo(
    () =>
      getAutomationRuleColumns({
        savingId,
        onToggle: (rule, enabled) => void toggleRule(rule, enabled),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savingId]
  );

  const candidateColumns = useMemo(() => getDocExpiryColumns(), []);

  const filteredRules = useMemo(() => {
    const q = debouncedRulesSearch.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        r.rule_key.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [rules, debouncedRulesSearch]);

  const pagedRules = useMemo(() => {
    const from = (rulesPage - 1) * rulesPageSize;
    return filteredRules.slice(from, from + rulesPageSize);
  }, [filteredRules, rulesPage, rulesPageSize]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        subtitle="Driver push rules (SSOT). Toggle only — cron worker comes next. All OFF until enabled."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      <div className="space-y-8 px-4 pb-8 sm:px-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Rules</h2>
          </div>
          <DataTableShell
            columns={ruleColumns}
            rows={pagedRules}
            totalRows={filteredRules.length}
            isLoading={loading}
            searchValue={rulesSearch}
            onSearchChange={setRulesSearch}
            searchPlaceholder="Search rules…"
            page={rulesPage}
            pageSize={rulesPageSize}
            onPageChange={setRulesPage}
            onPageSizeChange={(size) => {
              setRulesPageSize(size);
              setRulesPage(1);
            }}
            emptyIcon={Zap}
            emptyTitle="No automation rules"
            emptyDescription="No rules for this organization yet."
          />
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">
              Doc expiry candidates (next 30 days)
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              SSOT `admin_doc_expiry_candidates_v1` — preview for document
              reminders (push to drivers when automation is ON + cron runs).
            </p>
          </div>
          <DataTableShell
            columns={candidateColumns}
            rows={candidates}
            totalRows={candidatesTotal}
            isLoading={loading}
            searchValue={candidatesSearch}
            onSearchChange={setCandidatesSearch}
            searchPlaceholder="Search driver, email, document, plate…"
            page={candidatesPage}
            pageSize={candidatesPageSize}
            onPageChange={setCandidatesPage}
            onPageSizeChange={(size) => {
              setCandidatesPageSize(size);
              setCandidatesPage(1);
            }}
            emptyIcon={FileWarning}
            emptyTitle="No docs expiring soon"
            emptyDescription="No approved documents expiring in the next 30 days."
          />
        </section>
      </div>
    </div>
  );
}
