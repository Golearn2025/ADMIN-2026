"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

interface DriverActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "suspend" | "deactivate";
  driverName: string;
  onConfirm: (reason: string) => void;
  isProcessing?: boolean;
}

const SUSPEND_REASONS = [
  "Compliance issue",
  "Customer complaint",
  "Fraud suspected",
  "Document expired",
  "Inactivity",
  "Other",
];

const DEACTIVATE_REASONS = [
  "Driver request",
  "Temporary pause",
  "Vehicle unavailable",
  "No activity",
  "Other",
];

export function DriverActionDialog({
  open,
  onOpenChange,
  action,
  driverName,
  onConfirm,
  isProcessing = false,
}: DriverActionDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  const reasons = action === "suspend" ? SUSPEND_REASONS : DEACTIVATE_REASONS;
  const title = action === "suspend" ? "Suspend Driver" : "Deactivate Driver";
  const description =
    action === "suspend"
      ? `Are you sure you want to suspend ${driverName}? This will prevent them from receiving jobs.`
      : `Are you sure you want to deactivate ${driverName}? They will need to be reactivated to receive jobs.`;

  const handleConfirm = () => {
    const finalReason =
      selectedReason === "Other" ? customReason : selectedReason;

    if (!finalReason.trim()) {
      return;
    }

    onConfirm(finalReason);
    handleClose();
  };

  const handleClose = () => {
    setSelectedReason("");
    setCustomReason("");
    onOpenChange(false);
  };

  const isValid =
    selectedReason &&
    (selectedReason !== "Other" || customReason.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedReason === "Other" && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Custom Reason *</Label>
              <Textarea
                id="custom-reason"
                placeholder="Enter custom reason..."
                value={customReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant={action === "suspend" ? "destructive" : "secondary"}
            onClick={handleConfirm}
            disabled={!isValid || isProcessing}
          >
            {isProcessing ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
