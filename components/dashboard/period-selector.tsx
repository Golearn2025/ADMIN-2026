/**
 * Selector de perioadă pentru dashboard
 * Oferă preset-uri comune + opțiune de interval personalizat
 */

"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { Period, PeriodPreset } from "@/lib/utils/date-periods";

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
  className?: string;
}

const PRESET_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 days" },
  { value: "last30days", label: "Last 30 days" },
  { value: "last90days", label: "Last 90 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "thisYear", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range..." },
];

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const handlePresetChange = (preset: string) => {
    if (preset === "custom") {
      // Deschide dialogul pentru interval personalizat
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      setFromDate(formatDateForInput(thirtyDaysAgo));
      setToDate(formatDateForInput(now));
      setCustomDialogOpen(true);
    } else {
      onChange({ preset: preset as PeriodPreset });
    }
  };

  const handleCustomRangeApply = () => {
    if (!fromDate || !toDate) {
      return;
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Validation: from must be before to
    if (from > to) {
      alert("Start date must be before end date");
      return;
    }

    onChange({
      preset: "custom",
      customRange: { from, to },
    });

    setCustomDialogOpen(false);
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDisplayValue = (): string => {
    if (value.preset === "custom" && value.customRange) {
      const fmt = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
      });
      return `${fmt.format(value.customRange.from)} - ${fmt.format(value.customRange.to)}`;
    }
    
    const option = PRESET_OPTIONS.find(opt => opt.value === value.preset);
    return option?.label || "Select period";
  };

  return (
    <>
      <Select
        value={value.preset === "custom" ? "custom-display" : value.preset}
        onValueChange={handlePresetChange}
      >
        <SelectTrigger className={className}>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <SelectValue>
              {getDisplayValue()}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Dialog for custom range */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom date range</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="from-date">From</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="to-date">To</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCustomDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCustomRangeApply}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
