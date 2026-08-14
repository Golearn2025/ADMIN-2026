"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, X } from "lucide-react";
import type { LocationPoint } from "@/hooks/use-new-job";
import { cn } from "@/lib/utils";

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: { main_text: string; secondary_text: string };
}

interface PlacesAutocompleteProps {
  label: string;
  value: LocationPoint | null;
  onChange: (v: LocationPoint | null) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function PlacesAutocomplete({
  label,
  value,
  onChange,
  placeholder = "Type an address...",
  required,
  className,
}: PlacesAutocompleteProps) {
  const [query, setQuery] = useState(value?.address || "");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep query in sync if value changes externally
  useEffect(() => {
    if (value?.address && value.address !== query) {
      setQuery(value.address);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.address]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setPredictions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/places/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setPredictions(data.predictions || []);
      setOpen(true);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (value) onChange(null); // clear selection when typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  }

  async function selectPrediction(p: Prediction) {
    setQuery(p.description);
    setPredictions([]);
    setOpen(false);
    setResolving(true);
    try {
      const res = await fetch(`/api/admin/places/details?placeId=${p.place_id}`);
      const data = await res.json();
      if (data.lat != null && data.lng != null) {
        onChange({
          address: data.address || p.description,
          lat: data.lat,
          lng: data.lng,
          placeId: data.placeId || p.place_id,
        });
        setQuery(data.address || p.description);
      }
    } catch { /* ignore */ }
    setResolving(false);
  }

  function clear() {
    setQuery("");
    setPredictions([]);
    setOpen(false);
    onChange(null);
  }

  const isResolved = value != null && value.lat !== 51.5074;

  return (
    <div className={cn("space-y-1", className)} ref={containerRef}>
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <MapPin className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none",
          isResolved ? "text-primary" : "text-muted-foreground"
        )} />
        <Input
          value={query}
          onChange={handleInput}
          placeholder={placeholder}
          className="pl-9 pr-8"
          onFocus={() => predictions.length > 0 && setOpen(true)}
        />
        {(resolving || loading) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        {!resolving && !loading && query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Dropdown */}
        {open && predictions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
            {predictions.map((p) => (
              <button
                key={p.place_id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectPrediction(p); }}
                className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.structured_formatting?.main_text || p.description}
                  </p>
                  {p.structured_formatting?.secondary_text && (
                    <p className="text-xs text-muted-foreground truncate">
                      {p.structured_formatting.secondary_text}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {isResolved && (
        <p className="text-[10px] text-primary flex items-center gap-1">
          <span>✓</span> {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
        </p>
      )}
    </div>
  );
}
