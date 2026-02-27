"use client";

export function Topbar() {
  return (
    <div className="flex h-16 items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-primary">Vantage Lane</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded-full bg-muted" />
      </div>
    </div>
  );
}
