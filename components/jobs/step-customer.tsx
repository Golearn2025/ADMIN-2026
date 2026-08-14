"use client";

import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Search, X } from "lucide-react";
import type { CustomerForm } from "@/hooks/use-new-job";
import { cn } from "@/lib/utils";

interface StepCustomerProps {
  value: CustomerForm;
  onChange: (v: CustomerForm) => void;
  onNext: () => void;
}

interface CustomerResult {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

export function StepCustomer({ value, onChange, onNext }: StepCustomerProps) {
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchQ.length < 2) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(searchQ)}`);
        const data = await res.json();
        setResults(data.customers || []);
      } catch { /* ignore */ }
      setSearching(false);
    }, 300);
  }, [searchQ]);

  function selectExisting(c: CustomerResult) {
    onChange({
      mode: "existing",
      customerId: c.id,
      email: c.email,
      phone: c.phone || "",
      firstName: c.first_name,
      lastName: c.last_name,
    });
    setSearchQ("");
    setResults([]);
  }

  function clearExisting() {
    onChange({ mode: "new", email: "", phone: "", firstName: "", lastName: "" });
  }

  const canProceed =
    value.mode === "existing"
      ? !!value.customerId
      : !!(value.email && value.phone);

  return (
    <div className="space-y-6">
      {/* Tabs: existing vs new */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...value, mode: "existing", customerId: undefined })}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
            value.mode === "existing"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          <Search className="inline-block w-4 h-4 mr-1" /> Client existent
        </button>
        <button
          type="button"
          onClick={() => onChange({ mode: "new", email: "", phone: "", firstName: "", lastName: "" })}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
            value.mode === "new"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          <UserPlus className="inline-block w-4 h-4 mr-1" /> Client nou
        </button>
      </div>

      {/* EXISTING CLIENT */}
      {value.mode === "existing" && (
        <div className="space-y-3">
          {value.customerId ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{value.firstName} {value.lastName}</p>
                  <p className="text-xs text-muted-foreground">{value.email} · {value.phone}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={clearExisting}>
                  <X className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div>
                <Label>Caută după email, telefon sau nume</Label>
                <Input
                  placeholder="ex: john@example.com sau 07..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="mt-1"
                />
              </div>

              {searching && <p className="text-xs text-muted-foreground">Caută...</p>}

              {results.length > 0 && (
                <div className="border border-border rounded-lg divide-y overflow-hidden">
                  {results.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectExisting(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email} · {c.phone || "—"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!searching && searchQ.length >= 2 && results.length === 0 && (
                <p className="text-xs text-muted-foreground">Niciun client găsit.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* NEW CLIENT */}
      {value.mode === "new" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prenume</Label>
              <Input
                placeholder="John"
                value={value.firstName}
                onChange={e => onChange({ ...value, firstName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Nume</Label>
              <Input
                placeholder="Doe"
                value={value.lastName}
                onChange={e => onChange({ ...value, lastName: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Email <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              placeholder="client@example.com"
              value={value.email}
              onChange={e => onChange({ ...value, email: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Telefon <span className="text-destructive">*</span></Label>
            <Input
              type="tel"
              placeholder="+44 7..."
              value={value.phone}
              onChange={e => onChange({ ...value, phone: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      )}

      <Button className="w-full" disabled={!canProceed} onClick={onNext}>
        Continuă →
      </Button>
    </div>
  );
}
