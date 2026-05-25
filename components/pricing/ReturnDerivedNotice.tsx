"use client";

import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

/**
 * RETURN vehicle-rate rows are not used by the live pricing engine (legs use oneway rates).
 * Return trip discount % is on the Return tab → pricing_return_rules.
 */
export function ReturnDerivedNotice({ variant = "vehicle" }: { variant?: "vehicle" | "rules" }) {
  if (variant === "rules") {
    return (
      <div className="mb-4 rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Return booking discount</span> — percentage off the
        combined outbound + inbound subtotal. Mileage/base rates for each leg come from{" "}
        <span className="font-mono">oneway</span> vehicle rates at quote time, not from return rows.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-xs text-foreground/90 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Info className="h-3.5 w-3.5 text-sky-400 shrink-0" />
        <span className="font-semibold text-sky-300">Return pricing is derived from Oneway at runtime</span>
        <Badge variant="outline" className="text-[10px] border-sky-500/40 text-sky-300">
          Engine SSOT: oneway
        </Badge>
      </div>
      <p className="text-muted-foreground pl-5">
        Rows with booking type <span className="font-mono">return</span> are read-only here. The quote engine maps
        return legs to <span className="font-mono">oneway</span> rates; edit Executive/Luxury/etc. under{" "}
        <span className="font-mono">oneway</span>. Use &quot;Mirror Return from Oneway&quot; only if you need DB rows
        to match (e.g. retail exports) — it does not change live quotes.
      </p>
    </div>
  );
}
