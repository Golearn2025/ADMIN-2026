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

/** Empty modelId = category-only — all drivers in that category can see the job. */
export const ANY_MODEL_ID = "";

export function StepVehicle({ value, onChange, onNext, onPrev }: StepVehicleProps) {
  function selectCategory(catId: string) {
    // Keep category-only if already selected; otherwise keep current model if still valid
    const models = MODELS[catId] || [];
    const keepAny = value.modelId === ANY_MODEL_ID;
    const modelStillValid = models.some((m) => m.id === value.modelId);
    onChange({
      categoryId: catId,
      modelId: keepAny ? ANY_MODEL_ID : modelStillValid ? value.modelId : models[0]?.id || ANY_MODEL_ID,
    });
  }

  const models = MODELS[value.categoryId] || [];
  const isAnyModel = value.modelId === ANY_MODEL_ID;

  return (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <Label className="text-sm font-semibold">Vehicle category</Label>
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

      {/* Model — specific OR any in category (admin-only flexibility for WhatsApp quotes) */}
      <div>
        <Label className="text-sm font-semibold">Specific model</Label>
        <p className="text-xs text-muted-foreground mt-1 mb-2">
          Optional for admin quotes: pick a model to lock the job, or Any model so all drivers in this category can see it.
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, modelId: ANY_MODEL_ID })}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
              isAnyModel
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            Any model
          </button>
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
        {isAnyModel && (
          <p className="text-xs text-muted-foreground mt-2">
            Drivers with any vehicle in <span className="font-medium capitalize">{value.categoryId}</span> will see this job.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onPrev}>← Back</Button>
        <Button className="flex-1" onClick={onNext} disabled={!value.categoryId}>
          Continue →
        </Button>
      </div>
    </div>
  );
}
