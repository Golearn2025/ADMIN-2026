"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
  hint?: string;
};

/** High-visibility upload target — industry pattern for admin ops. */
export function FileDropzone({
  file,
  onFileChange,
  accept = "image/*,application/pdf",
  disabled,
  hint = "PDF or photo · max 10MB",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      alert("File must be smaller than 10MB");
      return;
    }
    onFileChange(f);
  };

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
          "bg-amber-400/90 text-amber-950 hover:bg-amber-400",
          "border-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600",
          dragging && "scale-[1.01] bg-amber-300",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        <Upload className="h-8 w-8" />
        <span className="text-sm font-semibold sm:text-base">
          {file ? "Change file" : "Tap to upload document"}
        </span>
        <span className="text-xs sm:text-sm opacity-80">
          {file ? file.name : hint}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {file && (
        <button
          type="button"
          className="mt-2 w-full text-center text-xs text-muted-foreground underline"
          onClick={() => onFileChange(null)}
        >
          Remove file
        </button>
      )}
    </div>
  );
}
