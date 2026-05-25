"use client";

import { PageHeader } from "@/components/common/page-header";
import {
  FinancialOperationsScopeBanner,
  FinancialSettingsPanel,
} from "@/components/financial-operations";

export default function FinancialOperationsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Financial Operations"
        subtitle="Operational cost assumptions for estimated profitability (not client pricing or driver payout)"
      />
      <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl">
        <FinancialOperationsScopeBanner />
        <FinancialSettingsPanel />
      </div>
    </div>
  );
}
