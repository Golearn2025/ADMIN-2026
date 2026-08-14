"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { VehicleForm } from "@/hooks/use-new-job";
import { cn } from "@/lib/utils";

interface StepVehicleProps {
  value: VehicleForm;
  onChange: (v: VehicleForm) => void;
  onNext: () => void;
  onPrev: () => void;
}

const CATEGORIES = [
  { id: "executive", label: "Executive", desc: "BMW 5 / Mercedes E-Class" },
  { id: "luxury", label: "Luxury", desc: "BMW 7 / Mercedes S-Class" },
  { id: "mpv", label: "MPV", desc: "Mercedes V-Class" },
  { id: "suv", label: "SUV", desc: "Range Rover" },
];

const MODELS: Record<string, { id: string; label: string }[]> = {
  executive: [
    { id: "bmw-5-series", label: "BMW 5 Series" },
    { id: "mercedes-e-class", label: "Mercedes E-Class" },
  ],
  luxury: [
    { id: "bmw-7-series", label: "BMW 7 Series" },
    { id: "mercedes-s-class", label: "Mercedes S-Class" },
  ],
  mpv: [{ id: "mercedes-v-class", label: "Mercedes V-Class" }],
  suv: [{ id: "range-rover", label: "Range Rover" }],
};

export function StepVehicle({ value, onChange, onNext, onPrev }: StepVehicleProps) {
  function selectCategory(catId: string) {
    const firstModel = MODELS[catId]?.[0]?.id || "";
    onChange({ categoryId: catId, modelId: firstModel });
  }

  const models = MODELS[value.categoryId] || [];

  return (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <Label className="text-sm font-semibold">Categorie vehicul</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => selectCategory(cat.id)}
              className={cn(
                "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                value.categoryId === cat.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40"
              )}
            >
              <span className="text-sm font-semibold">{cat.label}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{cat.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Model */}
      <div>
        <Label className="text-sm font-semibold">Model specific</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {models.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ ...value, modelId: m.id })}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                value.modelId === m.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onPrev}>← Înapoi</Button>
        <Button className="flex-1" onClick={onNext}>Continuă →</Button>
      </div>
    </div>
  );
}
