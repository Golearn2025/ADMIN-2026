"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback: string;
  className?: string;
}

export function Avatar({ src, alt, fallback, className }: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(fallback);

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
      alt={alt || fallback}
      className={cn("rounded-full object-cover", className)}
      onError={() => setImageError(true)}
    />
  );
}
