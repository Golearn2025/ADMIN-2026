"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

interface EditExpiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentLabel: string;
  currentExpiry: string | null;
  onSave: (expiryDate: string | null) => Promise<void>;
  isProcessing?: boolean;
}

function toDateInputValue(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function EditExpiryDialog({
  open,
  onOpenChange,
  documentLabel,
  currentExpiry,
  onSave,
  isProcessing = false,
}: EditExpiryDialogProps) {
  const [expiryDate, setExpiryDate] = useState("");

  useEffect(() => {
    if (open) {
      setExpiryDate(toDateInputValue(currentExpiry));
    }
  }, [open, currentExpiry]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSave = async () => {
    await onSave(expiryDate.trim() ? expiryDate : null);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Edit Expiry Date
          </DialogTitle>
          <DialogDescription>
            Update the expiry date for <strong>{documentLabel}</strong>.
            Leave empty if this document has no expiry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="expiry-date">Expiry date</Label>
          <Input
            id="expiry-date"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            disabled={isProcessing}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setExpiryDate("")}
            disabled={isProcessing}
          >
            Clear date
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
