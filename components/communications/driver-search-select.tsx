"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { DriverOption } from "@/lib/features/communications";
import { Check, ChevronsUpDown, X } from "lucide-react";

type Props = {
  drivers: DriverOption[];
  value: string;
  onChange: (driverId: string) => void;
  placeholder?: string;
};

export function DriverSearchSelect({
  drivers,
  value,
  onChange,
  placeholder = "Search driver by name or email…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => drivers.find((d) => d.id === value) || null,
    [drivers, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drivers.slice(0, 40);
    return drivers
      .filter((d) => {
        const hay = `${d.name} ${d.email || ""} ${d.status || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [drivers, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={rootRef} className="relative space-y-1.5">
      {selected && !open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setQuery("");
          }}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm"
        >
          <span className="truncate text-left">
            {selected.name}
            {selected.email ? (
              <span className="text-muted-foreground"> · {selected.email}</span>
            ) : null}
            {selected.is_active === false ? " (inactive)" : ""}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      ) : (
        <div className="relative">
          <Input
            value={query}
            autoFocus={open}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
          />
          {(query || selected) && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => {
                setQuery("");
                if (selected) onChange("");
                setOpen(true);
              }}
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No drivers found</div>
          ) : (
            filtered.map((d) => {
              const active = d.id === value;
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60 ${
                    active ? "bg-muted/40" : ""
                  }`}
                  onClick={() => {
                    onChange(d.id);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{d.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {d.email || "—"}
                      {d.is_active === false ? " · inactive" : ""}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
