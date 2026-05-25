import { Info } from "lucide-react";

export function FinancialOperationsScopeBanner() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm text-foreground">
        <div className="flex gap-2">
          <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" aria-hidden />
          <p>
            This affects <strong>estimated operational profitability only</strong> (quote-time economics
            via <span className="font-mono text-xs">QuoteEconomicsMapper</span>).
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-foreground">
        <p className="font-medium text-amber-900 dark:text-amber-100 mb-2">Does NOT affect:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Customer quote pricing</li>
          <li>Driver marketplace payout</li>
        </ul>
      </div>
    </div>
  );
}
