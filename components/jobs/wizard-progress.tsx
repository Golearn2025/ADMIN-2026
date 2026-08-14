"use client";

import { cn } from "@/lib/utils";
import type { WizardStep } from "@/hooks/use-new-job";

const STEP_LABELS: Record<WizardStep, string> = {
  customer: "Client",
  trip: "Cursă",
  vehicle: "Mașină",
  price: "Preț",
  confirm: "Confirmare",
};

interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: WizardStep;
  currentIndex: number;
  onStepClick?: (step: WizardStep, index: number) => void;
}

export function WizardProgress({ steps, currentStep, currentIndex, onStepClick }: WizardProgressProps) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {steps.map((step, idx) => {
        const isDone = idx < currentIndex;
        const isActive = idx === currentIndex;
        const isClickable = idx < currentIndex && onStepClick;

        return (
          <div key={step} className="flex items-center flex-shrink-0">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(step, idx)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all",
                isActive && "bg-primary text-primary-foreground",
                isDone && "text-primary cursor-pointer hover:underline",
                !isActive && !isDone && "text-muted-foreground cursor-default"
              )}
            >
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                isActive && "bg-primary-foreground/20",
                isDone && "bg-primary text-primary-foreground",
                !isActive && !isDone && "bg-muted"
              )}>
                {isDone ? "✓" : idx + 1}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
            </button>

            {idx < steps.length - 1 && (
              <div className={cn(
                "w-6 h-0.5 mx-0.5 shrink-0 transition-colors",
                idx < currentIndex ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
