"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type EntityOption = {
  id: string;
  label: string;
  sublabel?: string | null;
};

type Props = {
  options: EntityOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
};

/** Mobile-first searchable picker (industry combobox without cmdk). */
export function EntitySearchPicker({
  options,
  value,
  onChange,
  placeholder = "Search…",
  emptyText = "No results",
  disabled,
  loading,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = options.find((o) => o.id === value) || null;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options.slice(0, 50);
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(needle) ||
          (o.sublabel || "").toLowerCase().includes(needle)
      )
      .slice(0, 50);
  }, [options, q]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  return (
    <div className="relative w-full">
      <Button
        type="button"
        variant="outline"
        disabled={disabled || loading}
        className="h-11 w-full justify-between gap-2 px-3 text-left font-normal"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 truncate">
          {selected ? (
            <>
              <span className="font-medium">{selected.label}</span>
              {selected.sublabel ? (
                <span className="text-muted-foreground"> · {selected.sublabel}</span>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground">
              {loading ? "Loading…" : placeholder}
            </span>
          )}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type to search…"
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto overscroll-contain p-1 sm:max-h-72">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </li>
            ) : (
              filtered.map((opt) => {
                const active = opt.id === value;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted",
                        active && "bg-muted"
                      )}
                      onClick={() => {
                        onChange(opt.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          active ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {opt.label}
                        </span>
                        {opt.sublabel ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {opt.sublabel}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          {value && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Clear selection
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
