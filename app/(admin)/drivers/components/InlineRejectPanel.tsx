"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface InlineRejectPanelProps {
  onSubmit: (reason: string) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

const PRESET_REASONS = [
  "Blurry",
  "Expired",
  "Wrong document",
  "Name mismatch",
  "Incomplete",
  "Invalid",
];

export function InlineRejectPanel({
  onSubmit,
  onCancel,
  isProcessing = false,
}: InlineRejectPanelProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customReason, setCustomReason] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const handleSelect = (reason: string) => {
    onSubmit(reason);
  };

  const handleCustomSubmit = () => {
    if (customReason.trim()) {
      onSubmit(customReason.trim());
      setCustomReason("");
      setShowCustom(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [onCancel]);

  if (showCustom) {
    return (
      <div ref={panelRef} className="absolute right-0 top-full mt-1 z-50 w-72 rounded-md border border-border bg-popover p-3 shadow-lg">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Custom reason
        </div>
        <textarea
          value={customReason}
          onChange={(e) => setCustomReason(e.target.value)}
          placeholder="Enter rejection reason..."
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowCustom(false);
              setCustomReason("");
            }}
            disabled={isProcessing}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleCustomSubmit}
            disabled={!customReason.trim() || isProcessing}
            className="flex-1"
          >
            Submit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={panelRef} className="absolute right-0 top-full mt-1 z-50 inline-flex flex-col gap-1 rounded-md border border-border bg-popover p-2 shadow-lg">
      <div className="text-xs font-medium text-muted-foreground px-2 py-1">
        Select reason
      </div>
      {PRESET_REASONS.map((reason) => (
        <button
          key={reason}
          type="button"
          onClick={() => handleSelect(reason)}
          disabled={isProcessing}
          className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left whitespace-nowrap"
        >
          <span>{reason}</span>
        </button>
      ))}
      <div className="border-t border-border my-1" />
      <button
        type="button"
        onClick={() => setShowCustom(true)}
        disabled={isProcessing}
        className="rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
      >
        Other...
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isProcessing}
        className="rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
      >
        Cancel
      </button>
    </div>
  );
}
