"use client";

import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface DocumentActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "ghost" | "default" | "destructive" | "outline";
  disabled?: boolean;
  className?: string;
}

export function DocumentActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "ghost",
  disabled = false,
  className = "",
}: DocumentActionButtonProps) {
  return (
    <Button
      size="sm"
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      className={className}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
