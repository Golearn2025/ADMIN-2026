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
import {
  DOC_EXPIRY_DAYS,
  JOB_REMINDER_MINUTES,
  sampleDocExpiryMessage,
  sampleJobReminderMessage,
} from "@/lib/features/communications";
import { FileWarning, MessageSquareText, RefreshCw, Zap } from "lucide-react";
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
        subtitle="Message formats ready · rules stay OFF until cron ships · toggle alone does not spam drivers"
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
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Message formats</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Doc reminders land in{" "}
            <span className="font-medium text-foreground">
              Notifications → Documents
            </span>
            . Job reminders land in{" "}
            <span className="font-medium text-foreground">
              Notifications → Updates
            </span>{" "}
            and should open{" "}
            <span className="font-medium text-foreground">Accepted</span>.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Documents · {DOC_EXPIRY_DAYS.join(" / ")} days
              </div>
              {DOC_EXPIRY_DAYS.map((days) => {
                const sample = sampleDocExpiryMessage(days);
                return (
                  <div
                    key={days}
                    className="rounded border border-border/60 bg-muted/30 px-2.5 py-2"
                  >
                    <div className="text-sm font-medium">{sample.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {sample.body}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {sample.inbox}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Jobs · {JOB_REMINDER_MINUTES.map((m) => `${m / 60}h`).join(" + ")}{" "}
                before pickup
              </div>
              {JOB_REMINDER_MINUTES.map((minutes) => {
                const sample = sampleJobReminderMessage(minutes);
                return (
                  <div
                    key={minutes}
                    className="rounded border border-border/60 bg-muted/30 px-2.5 py-2"
                  >
                    <div className="text-sm font-medium">{sample.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {sample.body}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {sample.inbox} · opens {sample.opens}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

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
