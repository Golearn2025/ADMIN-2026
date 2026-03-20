"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string | null;
  className?: string;
}

export function Avatar({ src, alt, fallback, className }: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const getInitials = (name: string) => {
    if (!name) return "??";
    const trimmed = name.trim();
    if (!trimmed) return "??";
    
    const parts = trimmed.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(fallback || "");

  if (!src || imageError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || fallback || "Avatar"}
      className={cn("rounded-full object-cover", className)}
      onError={() => setImageError(true)}
    />
  );
}
